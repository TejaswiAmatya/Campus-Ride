/**
 * Prisma seed script — run with:  npx prisma db seed
 * (or)                             docker-compose exec backend npx prisma db seed
 *
 * Creates demo data for all feature tracks. Safe to re-run (clears existing data first).
 *
 * NOTE: This creates Prisma DB records only. For the full auth flow, you also need to
 * create matching Supabase Auth users. See the commented-out block at the bottom.
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg(process.env.DATABASE_URL!),
});

// ── Fixed IDs (stable across re-seeds) ───────────────────────────────────────
const IDS = {
  admin: "24ceae05-aacd-4939-840d-a69e54e216df",
  alice: "a0000000-0000-0000-0000-000000000002", // passenger
  bob: "a0000000-0000-0000-0000-000000000003", // passenger
  carol: "a0000000-0000-0000-0000-000000000004", // passenger
  dave: "a0000000-0000-0000-0000-000000000005", // driver (approved)
  eve: "a0000000-0000-0000-0000-000000000006", // driver application pending
  driverProfile1: "dp000000-0000-0000-0000-000000000001",
  driverProfile2: "dp000000-0000-0000-0000-000000000002",
  ride1: "r0000000-0000-0000-0000-000000000001", // OPEN
  ride2: "r0000000-0000-0000-0000-000000000002", // COMPLETED
  ride3: "r0000000-0000-0000-0000-000000000003", // IN_PROGRESS
  booking1: "b0000000-0000-0000-0000-000000000001", // CONFIRMED on ride1
  booking2: "b0000000-0000-0000-0000-000000000002", // PENDING on ride1
  booking3: "b0000000-0000-0000-0000-000000000003", // COMPLETED on ride2
  booking4: "b0000000-0000-0000-0000-000000000004", // CANCELLED on ride1
  review1: "v0000000-0000-0000-0000-000000000001",
  review2: "v0000000-0000-0000-0000-000000000002",
};

async function main() {
  console.log("[seed] Clearing existing data…");

  // Delete in reverse dependency order
  await prisma.review.deleteMany();
  await prisma.report.deleteMany();
  await prisma.emailJob.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.ride.deleteMany();
  await prisma.driverProfile.deleteMany();
  await prisma.config.deleteMany();
  await prisma.user.deleteMany();

  console.log("[seed] Creating users…");

  const now = new Date();
  const daysFromNow = (d: number) => new Date(now.getTime() + d * 86_400_000);

  await prisma.user.createMany({
    data: [
      {
        id: IDS.admin,
        email: "amatte01@gettysburg.edu",
        name: "Tejaswi",
        role: "ADMIN",
        mustChangePassword: true,
      },
      {
        id: IDS.alice,
        email: "alice@university.edu",
        name: "Alice Andersen",
        phone: "+4791000001",
        role: "PASSENGER",
      },
      {
        id: IDS.bob,
        email: "bob@university.edu",
        name: "Bob Bakke",
        phone: "+4791000002",
        role: "PASSENGER",
      },
      {
        id: IDS.carol,
        email: "carol@university.edu",
        name: "Carol Christensen",
        phone: "+4791000003",
        role: "PASSENGER",
      },
      {
        id: IDS.dave,
        email: "dave@university.edu",
        name: "Dave Dahl",
        phone: "+4791000004",
        role: "DRIVER",
      },
      {
        id: IDS.eve,
        email: "eve@university.edu",
        name: "Eve Eriksen",
        phone: "+4791000005",
        role: "PASSENGER",
      },
    ],
  });

  console.log("[seed] Creating driver profiles…");

  await prisma.driverProfile.createMany({
    data: [
      {
        id: IDS.driverProfile1,
        userId: IDS.dave,
        licencePath: "https://placehold.co/licence-dave.jpg",
        vehicleInfo: {
          make: "Toyota",
          model: "Prius",
          year: 2020,
          colour: "Silver",
          plateNumber: "AB12345",
        },
        status: "APPROVED",
        approvedAt: now,
      },
      {
        id: IDS.driverProfile2,
        userId: IDS.eve,
        licencePath: "https://placehold.co/licence-eve.jpg",
        vehicleInfo: {
          make: "Volkswagen",
          model: "Golf",
          year: 2019,
          colour: "Blue",
          plateNumber: "CD67890",
        },
        status: "PENDING",
      },
    ],
  });

  console.log("[seed] Creating rides…");

  await prisma.ride.createMany({
    data: [
      {
        // Ride 1 — OPEN, upcoming, seats available
        id: IDS.ride1,
        driverId: IDS.dave,
        originAddress: "University of Stavanger, Stavanger",
        originLat: 58.9,
        originLng: 5.71,
        destinationAddress: "Stavanger Central Station",
        destinationLat: 58.974,
        destinationLng: 5.732,
        departureTime: daysFromNow(2),
        totalSeats: 3,
        availableSeats: 1, // 2 already booked
        pricePerSeat: 80,
        status: "OPEN",
      },
      {
        // Ride 2 — COMPLETED, past
        id: IDS.ride2,
        driverId: IDS.dave,
        originAddress: "Stavanger Central Station",
        originLat: 58.974,
        originLng: 5.732,
        destinationAddress: "University of Stavanger, Stavanger",
        destinationLat: 58.9,
        destinationLng: 5.71,
        departureTime: daysFromNow(-5),
        totalSeats: 4,
        availableSeats: 3,
        pricePerSeat: 60,
        status: "COMPLETED",
      },
      {
        // Ride 3 — IN_PROGRESS, started today
        id: IDS.ride3,
        driverId: IDS.dave,
        originAddress: "Stavanger Airport Sola",
        originLat: 58.877,
        originLng: 5.636,
        destinationAddress: "University of Stavanger, Stavanger",
        destinationLat: 58.9,
        destinationLng: 5.71,
        departureTime: new Date(now.getTime() - 30 * 60 * 1000), // 30 min ago
        totalSeats: 3,
        availableSeats: 2,
        pricePerSeat: 100,
        status: "IN_PROGRESS",
      },
    ],
  });

  console.log("[seed] Creating bookings…");

  await prisma.booking.createMany({
    data: [
      {
        // Booking 1 — CONFIRMED on ride1, Alice booked 1 seat
        id: IDS.booking1,
        rideId: IDS.ride1,
        passengerId: IDS.alice,
        seatsBooked: 1,
        totalFare: 80,
        platformFee: 8,
        driverEarnings: 72,
        status: "CONFIRMED",
        paymentStatus: "PAID",
      },
      {
        // Booking 2 — PENDING on ride1, Bob waiting for driver
        id: IDS.booking2,
        rideId: IDS.ride1,
        passengerId: IDS.bob,
        seatsBooked: 1,
        totalFare: 80,
        platformFee: 8,
        driverEarnings: 72,
        status: "PENDING",
        paymentStatus: "UNPAID",
      },
      {
        // Booking 3 — COMPLETED on ride2, Alice rode
        id: IDS.booking3,
        rideId: IDS.ride2,
        passengerId: IDS.alice,
        seatsBooked: 1,
        totalFare: 60,
        platformFee: 6,
        driverEarnings: 54,
        status: "COMPLETED",
        paymentStatus: "PAID",
      },
      {
        // Booking 4 — CANCELLED on ride1, Carol cancelled
        id: IDS.booking4,
        rideId: IDS.ride1,
        passengerId: IDS.carol,
        seatsBooked: 1,
        totalFare: 80,
        platformFee: 8,
        driverEarnings: 72,
        status: "CANCELLED",
        paymentStatus: "REFUNDED",
      },
    ],
  });

  console.log("[seed] Creating reviews…");

  await prisma.review.createMany({
    data: [
      {
        id: IDS.review1,
        rideId: IDS.ride2,
        reviewerId: IDS.alice,
        revieweeId: IDS.dave,
        rating: 5,
        comment: "Great driver, very punctual and friendly. Highly recommend!",
      },
      {
        id: IDS.review2,
        rideId: IDS.ride2,
        reviewerId: IDS.dave,
        revieweeId: IDS.alice,
        rating: 5,
        comment: "Excellent passenger, ready on time and easy to coordinate with.",
      },
    ],
  });

  console.log("[seed] Creating config…");

  await prisma.config.createMany({
    data: [
      { key: "platformFeePercent", value: "10" },
      { key: "allowedEmailDomains", value: "university.edu,ac.uk" },
      { key: "maxSeatsPerRide", value: "8" },
    ],
  });

  console.log("[seed] Creating sample email jobs…");

  await prisma.emailJob.createMany({
    data: [
      {
        type: "welcome",
        recipientEmail: "alice@university.edu",
        payload: { name: "Alice Andersen" },
        sentAt: daysFromNow(-10),
      },
      {
        type: "booking-confirmed",
        recipientEmail: "alice@university.edu",
        payload: { bookingId: IDS.booking1, rideName: "UiS → Central Station" },
        sentAt: daysFromNow(-1),
      },
      {
        type: "driver-approved",
        recipientEmail: "dave@university.edu",
        payload: { name: "Dave Dahl" },
        sentAt: daysFromNow(-7),
      },
    ],
  });

  console.log("[seed] Done! Seeded:");
  console.log("  6 users (1 admin, 3 passengers, 2 drivers)");
  console.log("  2 vehicles");
  console.log("  3 rides (OPEN, COMPLETED, IN_PROGRESS)");
  console.log("  4 bookings (CONFIRMED, PENDING, COMPLETED, CANCELLED)");
  console.log("  2 reviews");
  console.log("  3 config entries");
  console.log("  3 email job log entries");
}

main()
  .catch((err) => {
    console.error("[seed] Failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

/*
 * ─── Creating matching Supabase Auth users ────────────────────────────────────
 * The records above exist in PostgreSQL. To log in via the app, create matching
 * Supabase Auth users with the SAME IDs and emails:
 *
 * import { createClient } from '@supabase/supabase-js'
 * const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
 *
 * for (const { id, email } of [
 *   { id: IDS.admin, email: 'admin@campus-ride.app' },
 *   { id: IDS.alice, email: 'alice@university.edu' },
 *   // ... etc.
 * ]) {
 *   await supabase.auth.admin.createUser({
 *     id,
 *     email,
 *     password: 'SeedPass123!',  // change per-user as needed
 *     email_confirm: true,
 *   })
 * }
 */
