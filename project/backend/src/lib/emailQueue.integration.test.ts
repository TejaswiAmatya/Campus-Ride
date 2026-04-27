import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("email queue integration", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env.NODE_ENV = "test";
    process.env.VITEST = "true";
  });

  it("becomes a no-op when queueing is disabled in the test environment", async () => {
    const queueConstructors: unknown[][] = [];
    const add = vi.fn();

    vi.doMock("bullmq", () => ({
      Queue: class FakeQueue {
        constructor(...args: unknown[]) {
          queueConstructors.push(args);
        }

        add = add;
      },
    }));

    const module = await import("./emailQueue");
    await module.emailQueue.welcomeEmail("user-1", "alice@university.edu");

    expect(queueConstructors).toEqual([]);
    expect(add).not.toHaveBeenCalled();
  });

  it("creates the queue once and enqueues jobs when the integration environment enables it", async () => {
    const queueConstructors: unknown[][] = [];
    const add = vi.fn().mockResolvedValue(undefined);

    delete process.env.VITEST;
    process.env.NODE_ENV = "development";

    vi.doMock("bullmq", () => ({
      Queue: class FakeQueue {
        constructor(...args: unknown[]) {
          queueConstructors.push(args);
        }

        add = add;
      },
    }));

    vi.doMock("../config/redis", () => ({
      default: { kind: "redis-connection" },
    }));

    const module = await import("./emailQueue");

    await module.emailQueue.welcomeEmail("user-1", "alice@university.edu");
    await module.emailQueue.rideUpdated("ride-1", "Delayed by 10 minutes");

    expect(queueConstructors).toEqual([[
      "email-notifications",
      {
        connection: { kind: "redis-connection" },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: "exponential", delay: 5000 },
        },
      },
    ]]);
    expect(add).toHaveBeenNthCalledWith(1, "welcomeEmail", {
      userId: "user-1",
      email: "alice@university.edu",
    });
    expect(add).toHaveBeenNthCalledWith(2, "rideUpdated", {
      rideId: "ride-1",
      updateMessage: "Delayed by 10 minutes",
    });
  });

  it("surfaces enqueue failures to the caller", async () => {
    delete process.env.VITEST;
    process.env.NODE_ENV = "development";

    vi.doMock("bullmq", () => ({
      Queue: class FakeQueue {
        add = vi.fn().mockRejectedValue(new Error("redis write failed"));
      },
    }));

    vi.doMock("../config/redis", () => ({
      default: { kind: "redis-connection" },
    }));

    const module = await import("./emailQueue");

    await expect(
      module.emailQueue.bookingConfirmed("booking-1"),
    ).rejects.toThrow("redis write failed");
  });
});
