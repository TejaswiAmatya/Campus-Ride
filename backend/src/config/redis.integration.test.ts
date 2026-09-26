import { afterEach, describe, expect, it, vi } from "vitest";

describe("redis wiring integration", () => {
  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    delete process.env.REDIS_URL;
    delete process.env.REDIS_HOST;
    delete process.env.REDIS_PORT;
    delete process.env.REDIS_PASSWORD;
  });

  it("constructs redis from REDIS_URL and wires connection logs", async () => {
    const constructorArgs: unknown[][] = [];
    const handlers: Record<string, (value?: unknown) => void> = {};

    vi.doMock("ioredis", () => ({
      Redis: class FakeRedis {
        constructor(...args: unknown[]) {
          constructorArgs.push(args);
        }

        on(event: string, callback: (value?: unknown) => void) {
          handlers[event] = callback;
          return this;
        }
      },
    }));

    process.env.REDIS_URL = "redis://cache:6379/2";
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const module = await import("./redis");

    expect(module.default).toBeTruthy();
    expect(constructorArgs).toEqual([
      ["redis://cache:6379/2", { maxRetriesPerRequest: null }],
    ]);

    handlers.connect?.();
    const boom = new Error("redis down");
    handlers.error?.(boom);

    expect(logSpy).toHaveBeenCalledWith("Redis connected");
    expect(errorSpy).toHaveBeenCalledWith("Redis error:", boom);
  });

  it("falls back to host, port, and password env wiring", async () => {
    const constructorArgs: unknown[][] = [];

    vi.doMock("ioredis", () => ({
      Redis: class FakeRedis {
        constructor(...args: unknown[]) {
          constructorArgs.push(args);
        }

        on() {
          return this;
        }
      },
    }));

    process.env.REDIS_HOST = "redis.internal";
    process.env.REDIS_PORT = "6380";
    process.env.REDIS_PASSWORD = "secret";

    await import("./redis");

    expect(constructorArgs).toEqual([
      [{
        host: "redis.internal",
        port: 6380,
        password: "secret",
        maxRetriesPerRequest: null,
      }],
    ]);
  });
});
