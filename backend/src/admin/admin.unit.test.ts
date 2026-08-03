import { describe, it, expect } from "vitest";
import {
  AcademicDecisionSchema,
  CreateModerationActionSchema,
  DriverDecisionSchema,
  MarkAnnouncementReadSchema,
  UpdateConfigSchema,
  ResolveReportSchema,
  CreateReportSchema,
  SendAnnouncementSchema,
} from "./schemas";

describe("DriverDecisionSchema", () => {
  it("accepts an approval", () => {
    expect(DriverDecisionSchema.safeParse({ approved: true }).success).toBe(
      true,
    );
  });

  it("accepts a rejection with a reason", () => {
    expect(
      DriverDecisionSchema.safeParse({
        approved: false,
        reason: "Licence unreadable",
      }).success,
    ).toBe(true);
  });

  it("rejects a rejection without a reason", () => {
    expect(DriverDecisionSchema.safeParse({ approved: false }).success).toBe(
      false,
    );
  });

  it("rejects a rejection with a blank reason", () => {
    expect(
      DriverDecisionSchema.safeParse({
        approved: false,
        reason: "   ",
      }).success,
    ).toBe(false);
  });

  it("rejects when approved is not a boolean", () => {
    expect(DriverDecisionSchema.safeParse({ approved: "yes" }).success).toBe(
      false,
    );
  });
});

describe("AcademicDecisionSchema", () => {
  it("accepts an approval", () => {
    expect(AcademicDecisionSchema.safeParse({ approved: true }).success).toBe(
      true,
    );
  });

  it("accepts a rejection with a reason", () => {
    expect(
      AcademicDecisionSchema.safeParse({
        approved: false,
        reason: "Student ID image was unreadable",
      }).success,
    ).toBe(true);
  });

  it("rejects a rejection without a reason", () => {
    expect(AcademicDecisionSchema.safeParse({ approved: false }).success).toBe(
      false,
    );
  });

  it("rejects a rejection with a blank reason", () => {
    expect(
      AcademicDecisionSchema.safeParse({
        approved: false,
        reason: "   ",
      }).success,
    ).toBe(false);
  });
});

describe("UpdateConfigSchema", () => {
  it("accepts a valid key-value pair", () => {
    expect(
      UpdateConfigSchema.safeParse({ key: "platformFeePercent", value: "12" })
        .success,
    ).toBe(true);
  });

  it("rejects an empty key", () => {
    expect(UpdateConfigSchema.safeParse({ key: "", value: "10" }).success).toBe(
      false,
    );
  });

  it("rejects an empty value", () => {
    expect(
      UpdateConfigSchema.safeParse({ key: "platformFeePercent", value: "" })
        .success,
    ).toBe(false);
  });

  it("rejects a non-numeric platform fee percentage", () => {
    expect(
      UpdateConfigSchema.safeParse({
        key: "platformFeePercent",
        value: "ten",
      }).success,
    ).toBe(false);
  });

  it("rejects a platform fee percentage above 100", () => {
    expect(
      UpdateConfigSchema.safeParse({
        key: "platformFeePercent",
        value: "150",
      }).success,
    ).toBe(false);
  });

  it("rejects unknown config keys", () => {
    expect(
      UpdateConfigSchema.safeParse({
        key: "secretInternalFlag",
        value: "enabled",
      }).success,
    ).toBe(false);
  });

  it("rejects a negative platform fee percentage", () => {
    expect(
      UpdateConfigSchema.safeParse({
        key: "platformFeePercent",
        value: "-1",
      }).success,
    ).toBe(false);
  });
});

describe("ResolveReportSchema", () => {
  it("accepts OPEN", () => {
    expect(ResolveReportSchema.safeParse({ resolution: "OPEN" }).success).toBe(
      true,
    );
  });

  it("accepts RESOLVED", () => {
    expect(
      ResolveReportSchema.safeParse({ resolution: "RESOLVED" }).success,
    ).toBe(true);
  });

  it("accepts DISMISSED with a note", () => {
    expect(
      ResolveReportSchema.safeParse({
        resolution: "DISMISSED",
        note: "Not a policy violation",
      }).success,
    ).toBe(true);
  });

  it("rejects an unknown resolution", () => {
    expect(
      ResolveReportSchema.safeParse({ resolution: "PENDING" }).success,
    ).toBe(false);
  });
});

describe("CreateReportSchema", () => {
  const validUUID = "550e8400-e29b-41d4-a716-446655440000";

  it("accepts a report targeting a user and ride", () => {
    expect(
      CreateReportSchema.safeParse({
        targetUserId: validUUID,
        targetRideId: validUUID,
        reason: "Inappropriate behaviour in chat",
      }).success,
    ).toBe(true);
  });

  it("rejects when targetUserId is missing", () => {
    expect(
      CreateReportSchema.safeParse({
        targetRideId: validUUID,
        reason: "Suspicious pickup location",
      }).success,
    ).toBe(false);
  });

  it("rejects when targetRideId is missing", () => {
    expect(
      CreateReportSchema.safeParse({
        targetUserId: validUUID,
        reason: "Something bad happened",
      }).success,
    ).toBe(false);
  });

  it("rejects a reason shorter than 10 characters", () => {
    expect(
      CreateReportSchema.safeParse({
        targetUserId: validUUID,
        targetRideId: validUUID,
        reason: "Bad",
      }).success,
    ).toBe(false);
  });
});

describe("SendAnnouncementSchema", () => {
  it("accepts a subject and message", () => {
    expect(
      SendAnnouncementSchema.safeParse({
        subject: "System maintenance",
        message: "The platform will be briefly unavailable tonight.",
      }).success,
    ).toBe(true);
  });

  it("rejects a blank subject", () => {
    expect(
      SendAnnouncementSchema.safeParse({
        subject: "   ",
        message: "Valid message",
      }).success,
    ).toBe(false);
  });

  it("rejects a blank message", () => {
    expect(
      SendAnnouncementSchema.safeParse({
        subject: "Valid subject",
        message: "   ",
      }).success,
    ).toBe(false);
  });
});

describe("MarkAnnouncementReadSchema", () => {
  it("accepts a non-empty announcement id", () => {
    expect(
      MarkAnnouncementReadSchema.safeParse({
        announcementId: "announcement-1",
      }).success,
    ).toBe(true);
  });

  it("rejects a blank announcement id", () => {
    expect(
      MarkAnnouncementReadSchema.safeParse({
        announcementId: "   ",
      }).success,
    ).toBe(false);
  });
});

describe("CreateModerationActionSchema", () => {
  it("accepts a suspension with a report id and end time", () => {
    expect(
      CreateModerationActionSchema.safeParse({
        actionType: "SUSPENSION",
        reason: "Repeated no-shows",
        note: "Three incidents in one week",
        reportId: "550e8400-e29b-41d4-a716-446655440000",
        suspendedUntil: "2026-06-01T12:00:00.000Z",
      }).success,
    ).toBe(true);
  });

  it("rejects a moderation action reason shorter than 3 characters", () => {
    expect(
      CreateModerationActionSchema.safeParse({
        actionType: "WARNING",
        reason: "no",
      }).success,
    ).toBe(false);
  });

  it("rejects an invalid report id", () => {
    expect(
      CreateModerationActionSchema.safeParse({
        actionType: "BAN",
        reason: "Unsafe behavior",
        reportId: "not-a-uuid",
      }).success,
    ).toBe(false);
  });
});
