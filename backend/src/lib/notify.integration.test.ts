import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  notifyAnnouncement: vi.fn(),
  notifyBookingNew: vi.fn(),
  notifyBookingStatus: vi.fn(),
  notifyModerationAction: vi.fn(),
  notifyRideStatus: vi.fn(),
  notifyRideUpdate: vi.fn(),
}));

vi.mock("./socket", () => ({
  notifyAnnouncement: mocks.notifyAnnouncement,
  notifyBookingNew: mocks.notifyBookingNew,
  notifyBookingStatus: mocks.notifyBookingStatus,
  notifyModerationAction: mocks.notifyModerationAction,
  notifyRideStatus: mocks.notifyRideStatus,
  notifyRideUpdate: mocks.notifyRideUpdate,
}));

import { notify } from "./notify";

describe("notify wiring integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("forwards booking notifications to the socket adapter", async () => {
    const payload = {
      bookingId: "booking-1",
      rideId: "ride-1",
      status: "CONFIRMED" as const,
      updatedAt: "2026-05-10T08:30:00.000Z",
    };

    await notify.bookingStatus("passenger-1", payload);
    await notify.bookingNew("driver-1", {
      bookingId: "booking-2",
      rideId: "ride-1",
      passengerId: "passenger-1",
    });

    expect(mocks.notifyBookingStatus).toHaveBeenCalledWith("passenger-1", payload);
    expect(mocks.notifyBookingNew).toHaveBeenCalledWith("driver-1", {
      bookingId: "booking-2",
      rideId: "ride-1",
      passengerId: "passenger-1",
    });
  });

  it("forwards ride, moderation, and announcement events", async () => {
    const announcement = {
      id: "announcement-1",
      subject: "Heads up",
      message: "Maintenance tonight",
      createdAt: "2026-05-10T08:30:00.000Z",
    };

    await notify.rideStatus("ride-1", {
      rideId: "ride-1",
      status: "IN_PROGRESS",
    });
    await notify.rideUpdate("ride-1", {
      rideId: "ride-1",
      updatedAt: "2026-05-10T08:30:00.000Z",
      changedFields: ["departureTime"],
    });
    await notify.moderationAction("user-1", {
      actionType: "WARNING",
      reason: "Policy issue",
      updatedAt: "2026-05-10T08:30:00.000Z",
    });
    await notify.announcement(announcement);

    expect(mocks.notifyRideStatus).toHaveBeenCalled();
    expect(mocks.notifyRideUpdate).toHaveBeenCalled();
    expect(mocks.notifyModerationAction).toHaveBeenCalled();
    expect(mocks.notifyAnnouncement).toHaveBeenCalledWith(announcement);
  });
});
