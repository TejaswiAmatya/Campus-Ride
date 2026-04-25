import { describe, expect, it } from "vitest";

import { buildEmail, type EmailJobPayload } from "./emailTemplates";

function normalizeHtml(html: string) {
  return html.replace(/\s+/g, " ").trim();
}

describe("buildEmail", () => {
  it.each([
    {
      name: "welcome email",
      payload: {
        type: "welcome",
        to: "alex@example.com",
        userName: "Alex",
      } satisfies EmailJobPayload,
      expectedSubject: "Welcome to Campus Ride",
      expectedBodyParts: [
        "Welcome to Campus Ride",
        "Hi Alex,",
        "Your account has been created successfully.",
        "You can now complete your profile, search for rides, or apply to become a driver.",
      ],
    },
    {
      name: "booking confirmed email",
      payload: {
        type: "booking-confirmed",
        to: "alex@example.com",
        passengerName: "Alex",
        rideDate: "2026-05-10",
        driverName: "Jordan",
        price: "$12.50",
      } satisfies EmailJobPayload,
      expectedSubject: "Your booking is confirmed",
      expectedBodyParts: [
        "Booking Confirmed",
        "Hi Alex,",
        "Your booking has been confirmed.",
        "<strong>Ride date:</strong> 2026-05-10",
        "<strong>Driver:</strong> Jordan",
        "<strong>Price:</strong> $12.50",
      ],
    },
    {
      name: "ride started email",
      payload: {
        type: "ride-started",
        to: "alex@example.com",
        passengerName: "Alex",
        rideDate: "2026-05-10",
        driverName: "Jordan",
      } satisfies EmailJobPayload,
      expectedSubject: "Your ride has started",
      expectedBodyParts: [
        "Ride Started",
        "Hi Alex,",
        "Your ride has now started.",
        "<strong>Ride date:</strong> 2026-05-10",
        "<strong>Driver:</strong> Jordan",
      ],
    },
    {
      name: "booking cancelled email",
      payload: {
        type: "booking-cancelled",
        to: "alex@example.com",
        passengerName: "Alex",
        rideDate: "2026-05-10",
        driverName: "Jordan",
      } satisfies EmailJobPayload,
      expectedSubject: "Your booking was cancelled",
      expectedBodyParts: [
        "Booking Cancelled",
        "Hi Alex,",
        "Your booking has been cancelled.",
        "<strong>Ride date:</strong> 2026-05-10",
        "<strong>Driver:</strong> Jordan",
      ],
    },
    {
      name: "driver approved email",
      payload: {
        type: "driver-approved",
        to: "alex@example.com",
        userName: "Alex",
      } satisfies EmailJobPayload,
      expectedSubject: "Your driver application was approved",
      expectedBodyParts: [
        "Driver Application Approved",
        "Hi Alex,",
        "Your driver application has been approved.",
        "You can now create rides in Campus Ride.",
      ],
    },
  ])("builds the $name", ({ payload, expectedSubject, expectedBodyParts }) => {
    const email = buildEmail(payload);
    const html = normalizeHtml(email.html);

    expect(email.subject).toBe(expectedSubject);

    for (const expectedBodyPart of expectedBodyParts) {
      expect(html).toContain(expectedBodyPart);
    }
  });

  it("includes the rejection reason when provided", () => {
    const email = buildEmail({
      type: "driver-rejected",
      to: "alex@example.com",
      userName: "Alex",
      reason: "License photo was too blurry",
    });
    const html = normalizeHtml(email.html);

    expect(email.subject).toBe("Your driver application was rejected");
    expect(html).toContain("Driver Application Rejected");
    expect(html).toContain("Hi Alex,");
    expect(html).toContain(
      "Your driver application was not approved at this time.",
    );
    expect(html).toContain(
      "<strong>Reason:</strong> License photo was too blurry",
    );
    expect(html).toContain(
      "You can review your information and apply again later if needed.",
    );
  });

  it("omits the rejection reason when not provided", () => {
    const email = buildEmail({
      type: "driver-rejected",
      to: "alex@example.com",
      userName: "Alex",
    });
    const html = normalizeHtml(email.html);

    expect(email.subject).toBe("Your driver application was rejected");
    expect(html).toContain("Driver Application Rejected");
    expect(html).toContain("Hi Alex,");
    expect(html).toContain(
      "Your driver application was not approved at this time.",
    );
    expect(html).not.toContain("<strong>Reason:</strong>");
    expect(html).toContain(
      "You can review your information and apply again later if needed.",
    );
  });
});
