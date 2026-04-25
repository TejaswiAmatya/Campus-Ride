import { describe, it, expect } from "vitest";
import {
  DriverDecisionSchema,
  UpdateConfigSchema,
  ResolveReportSchema,
  CreateReportSchema,
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

  it("accepts a rejection without a reason (reason is optional)", () => {
    expect(DriverDecisionSchema.safeParse({ approved: false }).success).toBe(
      true,
    );
  });

  it("rejects when approved is not a boolean", () => {
    expect(DriverDecisionSchema.safeParse({ approved: "yes" }).success).toBe(
      false,
    );
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
