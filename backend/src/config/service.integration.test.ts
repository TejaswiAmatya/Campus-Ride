import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMocks = vi.hoisted(() => ({
  upsert: vi.fn(),
  findMany: vi.fn(),
}));

vi.mock("../lib/prisma", () => ({
  prisma: {
    config: {
      upsert: prismaMocks.upsert,
      findMany: prismaMocks.findMany,
    },
  },
}));

import {
  DEFAULT_PLATFORM_FEE_PERCENT,
  PLATFORM_FEE_CONFIG_KEY,
  ensureConfigValue,
  getAdminConfigMap,
  getPlatformFeePercent,
  getPlatformFeeRate,
  getPublicConfigMap,
  upsertConfigValue,
} from "./service";

describe("config service integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ensures the default platform fee exists before listing admin config", async () => {
    prismaMocks.upsert.mockResolvedValue({ key: PLATFORM_FEE_CONFIG_KEY, value: DEFAULT_PLATFORM_FEE_PERCENT });
    prismaMocks.findMany.mockResolvedValue([
      { key: "allowedEmailDomains", value: "edu,no" },
      { key: PLATFORM_FEE_CONFIG_KEY, value: "12" },
    ]);

    const config = await getAdminConfigMap();

    expect(prismaMocks.upsert).toHaveBeenCalledWith({
      where: { key: PLATFORM_FEE_CONFIG_KEY },
      update: {},
      create: { key: PLATFORM_FEE_CONFIG_KEY, value: DEFAULT_PLATFORM_FEE_PERCENT },
    });
    expect(config).toEqual({
      allowedEmailDomains: "edu,no",
      platformFeePercent: "12",
    });
  });

  it("filters public config down to allowed keys", async () => {
    const client = {
      config: {
        upsert: vi.fn().mockResolvedValue({
          key: PLATFORM_FEE_CONFIG_KEY,
          value: DEFAULT_PLATFORM_FEE_PERCENT,
        }),
        findMany: vi.fn().mockResolvedValue([
          { key: "allowedEmailDomains", value: "edu,no" },
          { key: PLATFORM_FEE_CONFIG_KEY, value: "15" },
        ]),
      },
    };

    const config = await getPublicConfigMap(client as never);

    expect(config).toEqual({
      platformFeePercent: "15",
    });
  });

  it("normalizes invalid stored percentage values back to the default", async () => {
    const client = {
      config: {
        upsert: vi.fn().mockResolvedValue({
          key: PLATFORM_FEE_CONFIG_KEY,
          value: "500",
        }),
      },
    };

    const percent = await getPlatformFeePercent(client as never);
    const rate = await getPlatformFeeRate(client as never);

    expect(percent.equals(new Prisma.Decimal(10))).toBe(true);
    expect(rate.equals(new Prisma.Decimal("0.1"))).toBe(true);
  });

  it("wires through direct ensure and upsert helpers", async () => {
    const client = {
      config: {
        upsert: vi.fn().mockResolvedValue({
          key: "maxSeatsPerRide",
          value: "6",
        }),
      },
    };

    await ensureConfigValue("maxSeatsPerRide", "6", client as never);
    await upsertConfigValue("maxSeatsPerRide", "6", client as never);

    expect(client.config.upsert).toHaveBeenCalledTimes(2);
  });
});
