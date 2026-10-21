import { createServer, type Server as HttpServer } from "node:http";

import request from "supertest";
import { afterAll, afterEach, beforeAll, expect, it } from "vitest";

import { app } from "../app";
import { prisma } from "../lib/prisma";
import { getIO, initSocket } from "../lib/socket";
import { supabaseAdmin } from "../lib/supabase";
import { describeAuthIntegration } from "../test/integration/gates";

type ApiEnvelope<T> = {
  data: T | null;
  error: { code: string; message: string } | null;
  meta?: Record<string, unknown>;
};

const password = "password123";
let socketServer: HttpServer | null = null;

beforeAll(() => {
  socketServer = createServer(app);
  initSocket(socketServer);
});

afterAll(async () => {
  getIO().close();

  if (socketServer) {
    await new Promise<void>((resolve, reject) => {
      socketServer?.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
});

async function listAuthUserIdsByEmailPrefix(prefix: string): Promise<string[]> {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers();

  if (error) {
    throw error;
  }

  return (data.users ?? [])
    .filter((user) =>
      user.email?.toLowerCase().startsWith(prefix.toLowerCase()),
    )
    .map((user) => user.id);
}

async function getAuthUserIdByEmail(email: string): Promise<string> {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers();

  if (error) {
    throw error;
  }

  const authUser = (data.users ?? []).find(
    (user) => user.email?.toLowerCase() === email.toLowerCase(),
  );

  if (!authUser) {
    throw new Error(`missing auth user for ${email}`);
  }

  return authUser.id;
}

async function registerAndLoginUser(email: string, name: string) {
  const registerResponse = await request(app).post("/api/auth/register").send({
    email,
    name,
    password,
  });
  expect(registerResponse.status).toBe(202);

  const authUserId = await getAuthUserIdByEmail(email);
  const confirmResponse = await supabaseAdmin.auth.admin.updateUserById(
    authUserId,
    {
      email_confirm: true,
    },
  );
  expect(confirmResponse.error).toBeNull();

  const loginResponse = await request(app).post("/api/auth/login").send({
    email,
    password,
  });
  expect(loginResponse.status).toBe(200);

  const token = (loginResponse.body as ApiEnvelope<{ access_token: string }>)
    .data?.access_token;
  if (!token) {
    throw new Error(`missing access token for ${email}`);
  }

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true },
  });
  if (!user) {
    throw new Error(`missing prisma user for ${email}`);
  }

  return {
    userId: user.id,
    token,
  };
}

async function promoteToApprovedDriver(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { role: "DRIVER" },
  });

  await prisma.driverProfile.upsert({
    where: { userId },
    create: {
      userId,
      licencePath: "https://example.com/test-licence.jpg",
      vehicleInfo: {
        make: "Volvo",
        model: "V70",
        year: 2018,
        colour: "Black",
        plateNumber: "RIDETEST",
      },
      status: "APPROVED",
      approvedAt: new Date(),
    },
    update: {
      status: "APPROVED",
      approvedAt: new Date(),
    },
  });
}

function buildRidePayload() {
  return {
    origin: { address: "Campus Gate A", lat: 58.9, lng: 5.71 },
    destination: { address: "City Centre", lat: 58.95, lng: 5.72 },
    departureTime: new Date(Date.now() + 86_400_000).toISOString(),
    totalSeats: 4,
    pricePerSeat: 50,
  };
}

async function createRide(driverToken: string, payload = buildRidePayload()) {
  const response = await request(app)
    .post("/api/rides")
    .set("Authorization", `Bearer ${driverToken}`)
    .send(payload);

  expect(response.status).toBe(201);

  const rideId = (response.body as ApiEnvelope<{ id: string }>).data?.id;
  if (!rideId) {
    throw new Error("missing ride id");
  }

  return {
    rideId,
    response,
  };
}

async function createBooking(
  rideId: string,
  passengerToken: string,
  seatsBooked = 1,
) {
  const response = await request(app)
    .post("/api/bookings")
    .set("Authorization", `Bearer ${passengerToken}`)
    .send({ rideId, seatsBooked });

  expect(response.status).toBe(201);

  const bookingId = (response.body as ApiEnvelope<{ id: string }>).data?.id;
  if (!bookingId) {
    throw new Error("missing booking id");
  }

  return bookingId;
}

async function confirmBooking(bookingId: string, driverToken: string) {
  const response = await request(app)
    .patch(`/api/bookings/${bookingId}/confirm`)
    .set("Authorization", `Bearer ${driverToken}`);

  expect(response.status).toBe(200);
}

async function cleanupByEmailPrefix(prefix: string) {
  const users = await prisma.user.findMany({
    where: { email: { startsWith: prefix } },
    select: { id: true },
  });
  const ids = users.map((user) => user.id);

  if (ids.length > 0) {
    await prisma.review.deleteMany({
      where: {
        OR: [
          { reviewerId: { in: ids } },
          { revieweeId: { in: ids } },
          { ride: { driverId: { in: ids } } },
        ],
      },
    });
    await prisma.booking.deleteMany({
      where: {
        OR: [{ passengerId: { in: ids } }, { ride: { driverId: { in: ids } } }],
      },
    });
    await prisma.rideStop.deleteMany({
      where: { ride: { driverId: { in: ids } } },
    });
    await prisma.ride.deleteMany({ where: { driverId: { in: ids } } });
    await prisma.driverProfile.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  }

  const authUserIds = await listAuthUserIdsByEmailPrefix(prefix);
  for (const authUserId of authUserIds) {
    await supabaseAdmin.auth.admin.deleteUser(authUserId).catch(() => {});
  }
}

describeAuthIntegration(
  "Rides integration (requires full Supabase auth stack)",
  () => {
    const prefix = `rides-flow-${Date.now()}-`;

    afterEach(async () => {
      await cleanupByEmailPrefix(prefix);
    });

    it("returns the driver's rides with booking request details", async () => {
      const driverEmail = `${prefix}driver1@university.edu`;
      const passengerEmail = `${prefix}passenger1@university.edu`;
      const driver = await registerAndLoginUser(driverEmail, "Driver One");
      const passenger = await registerAndLoginUser(
        passengerEmail,
        "Passenger One",
      );

      await promoteToApprovedDriver(driver.userId);
      const { rideId } = await createRide(driver.token);
      await createBooking(rideId, passenger.token, 2);

      const response = await request(app)
        .get("/api/rides/mine")
        .set("Authorization", `Bearer ${driver.token}`);

      expect(response.status).toBe(200);
      expect((response.body as ApiEnvelope<any[]>).data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: rideId,
            _count: { bookings: 1 },
            bookings: expect.arrayContaining([
              expect.objectContaining({
                seatsBooked: 2,
                status: "PENDING",
                passenger: expect.objectContaining({
                  name: "Passenger One",
                }),
              }),
            ]),
          }),
        ]),
      );
    });

    it("creates a ride and returns it from search with the correct seat count", async () => {
      const driverEmail = `${prefix}driver2@university.edu`;
      const driver = await registerAndLoginUser(driverEmail, "Driver Two");

      await promoteToApprovedDriver(driver.userId);
      const payload = buildRidePayload();
      const { rideId, response: createResponse } = await createRide(
        driver.token,
        payload,
      );

      expect(
        (createResponse.body as ApiEnvelope<{ availableSeats: number }>).data
          ?.availableSeats,
      ).toBe(payload.totalSeats);

      const searchResponse = await request(app)
        .get("/api/rides")
        .query({
          date: payload.departureTime.slice(0, 10),
          origin: "Campus Gate",
          dest: "City Centre",
          seats: "2",
        });

      expect(searchResponse.status).toBe(200);
      expect((searchResponse.body as ApiEnvelope<any[]>).data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: rideId,
            availableSeats: 4,
            totalSeats: 4,
            originAddress: payload.origin.address,
            destinationAddress: payload.destination.address,
          }),
        ]),
      );
    });

    it("rejects ride creation for a passenger account", async () => {
      const passengerEmail = `${prefix}passenger2@university.edu`;
      const passenger = await registerAndLoginUser(
        passengerEmail,
        "Passenger Two",
      );

      const response = await request(app)
        .post("/api/rides")
        .set("Authorization", `Bearer ${passenger.token}`)
        .send(buildRidePayload());

      expect(response.status).toBe(403);
      expect((response.body as ApiEnvelope<never>).error?.code).toBe(
        "FORBIDDEN",
      );
    });

    it("persists ride updates and reports notification metadata for confirmed passengers", async () => {
      const driverEmail = `${prefix}driver3@university.edu`;
      const passengerEmail = `${prefix}passenger3@university.edu`;
      const driver = await registerAndLoginUser(driverEmail, "Driver Three");
      const passenger = await registerAndLoginUser(
        passengerEmail,
        "Passenger Three",
      );

      await promoteToApprovedDriver(driver.userId);
      const { rideId } = await createRide(driver.token);
      const bookingId = await createBooking(rideId, passenger.token, 1);
      await confirmBooking(bookingId, driver.token);

      const nextDeparture = new Date(Date.now() + 90 * 60 * 1000).toISOString();
      const response = await request(app)
        .patch(`/api/rides/${rideId}`)
        .set("Authorization", `Bearer ${driver.token}`)
        .send({
          departureTime: nextDeparture,
          totalSeats: 5,
          stops: [
            {
              address: "Student Union",
              lat: 58.905,
              lng: 5.705,
            },
          ],
          updateMessage: "Leaving 15 minutes later than planned",
        });

      expect(response.status).toBe(200);
      expect((response.body as ApiEnvelope<any>).meta).toMatchObject({
        notificationRequired: true,
        notificationsTriggered: true,
        confirmedPassengers: 1,
        changedFields: expect.arrayContaining([
          "departureTime",
          "totalSeats",
          "stops",
        ]),
        updateMessage: "Leaving 15 minutes later than planned",
      });

      const updatedRide = await prisma.ride.findUniqueOrThrow({
        where: { id: rideId },
        include: {
          stops: { orderBy: { orderIndex: "asc" } },
        },
      });
      expect(updatedRide.totalSeats).toBe(5);
      expect(updatedRide.availableSeats).toBe(4);
      expect(updatedRide.stops).toMatchObject([
        {
          address: "Student Union",
          orderIndex: 0,
        },
      ]);
    });

    it("allows the ride driver to start and complete a ride", async () => {
      const driverEmail = `${prefix}driver4@university.edu`;
      const passengerEmail = `${prefix}passenger4@university.edu`;
      const driver = await registerAndLoginUser(driverEmail, "Driver Four");
      const passenger = await registerAndLoginUser(
        passengerEmail,
        "Passenger Four",
      );

      await promoteToApprovedDriver(driver.userId);
      const { rideId } = await createRide(driver.token);
      const bookingId = await createBooking(rideId, passenger.token, 1);
      await confirmBooking(bookingId, driver.token);

      const startResponse = await request(app)
        .patch(`/api/rides/${rideId}/start`)
        .set("Authorization", `Bearer ${driver.token}`)
        .send({ startedAt: new Date().toISOString() });

      expect(startResponse.status).toBe(200);
      expect(
        (startResponse.body as ApiEnvelope<{ status: string }>).data?.status,
      ).toBe("IN_PROGRESS");

      const completeResponse = await request(app)
        .patch(`/api/rides/${rideId}/status`)
        .set("Authorization", `Bearer ${driver.token}`)
        .send({ status: "COMPLETED" });

      expect(completeResponse.status).toBe(200);
      expect(
        (completeResponse.body as ApiEnvelope<{ status: string }>).data?.status,
      ).toBe("COMPLETED");

      const completedBookings = await prisma.booking.findMany({
        where: { rideId },
        select: { status: true },
      });
      expect(completedBookings.map((booking) => booking.status)).toEqual([
        "COMPLETED",
      ]);
    });

    it("rejects illegal status transitions and status updates from another driver", async () => {
      const ownerEmail = `${prefix}driver5@university.edu`;
      const otherDriverEmail = `${prefix}driver6@university.edu`;
      const owner = await registerAndLoginUser(ownerEmail, "Driver Five");
      const otherDriver = await registerAndLoginUser(
        otherDriverEmail,
        "Driver Six",
      );

      await promoteToApprovedDriver(owner.userId);
      await promoteToApprovedDriver(otherDriver.userId);
      const { rideId } = await createRide(owner.token);

      const invalidTransition = await request(app)
        .patch(`/api/rides/${rideId}/status`)
        .set("Authorization", `Bearer ${owner.token}`)
        .send({ status: "COMPLETED" });

      expect(invalidTransition.status).toBe(409);
      expect((invalidTransition.body as ApiEnvelope<never>).error?.code).toBe(
        "INVALID_STATUS_TRANSITION",
      );

      const forbiddenResponse = await request(app)
        .patch(`/api/rides/${rideId}/status`)
        .set("Authorization", `Bearer ${otherDriver.token}`)
        .send({ status: "CANCELLED" });

      expect(forbiddenResponse.status).toBe(403);
      expect((forbiddenResponse.body as ApiEnvelope<never>).error?.code).toBe(
        "FORBIDDEN",
      );
    });

    it("cancels confirmed bookings, restores seats, and applies a cancellation strike", async () => {
      const driverEmail = `${prefix}driver7@university.edu`;
      const passengerOneEmail = `${prefix}passenger5@university.edu`;
      const passengerTwoEmail = `${prefix}passenger6@university.edu`;
      const driver = await registerAndLoginUser(driverEmail, "Driver Seven");
      const passengerOne = await registerAndLoginUser(
        passengerOneEmail,
        "Passenger Five",
      );
      const passengerTwo = await registerAndLoginUser(
        passengerTwoEmail,
        "Passenger Six",
      );

      await promoteToApprovedDriver(driver.userId);
      const { rideId } = await createRide(driver.token);
      const bookingOneId = await createBooking(rideId, passengerOne.token, 2);
      const bookingTwoId = await createBooking(rideId, passengerTwo.token, 1);
      await confirmBooking(bookingOneId, driver.token);
      await confirmBooking(bookingTwoId, driver.token);

      const response = await request(app)
        .delete(`/api/rides/${rideId}`)
        .set("Authorization", `Bearer ${driver.token}`);

      expect(response.status).toBe(200);
      expect((response.body as ApiEnvelope<any>).data?.status).toBe(
        "CANCELLED",
      );
      expect((response.body as ApiEnvelope<any>).meta).toMatchObject({
        cancellationStrikeApplied: true,
        affectedPassengers: 2,
      });

      const cancelledRide = await prisma.ride.findUniqueOrThrow({
        where: { id: rideId },
      });
      expect(cancelledRide.status).toBe("CANCELLED");
      expect(cancelledRide.availableSeats).toBe(4);

      const cancelledBookings = await prisma.booking.findMany({
        where: { rideId },
        select: { status: true },
      });
      expect(
        cancelledBookings.every((booking) => booking.status === "CANCELLED"),
      ).toBe(true);

      const driverProfile = await prisma.driverProfile.findUniqueOrThrow({
        where: { userId: driver.userId },
        select: { cancellationStrikes: true },
      });
      expect(driverProfile.cancellationStrikes).toBe(1);
    });
  },
);
