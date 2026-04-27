import { beforeEach, describe, expect, it, vi } from "vitest";

const workerState = vi.hoisted(() => ({
  sendMail: vi.fn(),
  buildEmail: vi.fn(),
  userFindUnique: vi.fn(),
  bookingFindUnique: vi.fn(),
  bookingFindMany: vi.fn(),
  workers: [] as FakeWorker[],
}));

class FakeWorker {
  public handlers: Record<string, (...args: any[]) => void> = {};

  constructor(
    public readonly queueName: string,
    public readonly processor: (job: any) => Promise<void>,
    public readonly options: unknown,
  ) {
    workerState.workers.push(this);
  }

  on(event: string, handler: (...args: any[]) => void) {
    this.handlers[event] = handler;
    return this;
  }
}

vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: workerState.sendMail,
    })),
  },
}));

vi.mock("bullmq", () => ({
  Worker: FakeWorker,
}));

vi.mock("../config/redis", () => ({
  default: { kind: "redis-connection" },
}));

vi.mock("../lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: workerState.userFindUnique,
    },
    booking: {
      findUnique: workerState.bookingFindUnique,
      findMany: workerState.bookingFindMany,
    },
  },
}));

vi.mock("../lib/emailTemplates", () => ({
  buildEmail: workerState.buildEmail,
}));

describe("email worker integration", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    workerState.workers.length = 0;
    process.env.SMTP_FROM = "Campus Ride <no-reply@campusride.local>";
  });

  it("creates the worker once and processes welcome emails", async () => {
    workerState.userFindUnique.mockResolvedValue({ name: "Alice" });
    workerState.buildEmail.mockReturnValue({
      subject: "Welcome",
      html: "<p>Hello</p>",
    });
    workerState.sendMail.mockResolvedValue(undefined);

    const module = await import("./emailWorkers");

    const first = module.startEmailWorker() as unknown as FakeWorker;
    const second = module.startEmailWorker() as unknown as FakeWorker;

    expect(second).toBe(first);
    expect(workerState.workers).toHaveLength(1);

    await first.processor({
      name: "welcomeEmail",
      data: { email: "alice@university.edu", userId: "user-1" },
    });

    expect(workerState.userFindUnique).toHaveBeenCalledWith({
      where: { id: "user-1" },
    });
    expect(workerState.buildEmail).toHaveBeenCalledWith({
      type: "welcome",
      to: "alice@university.edu",
      userName: "Alice",
    });
    expect(workerState.sendMail).toHaveBeenCalledWith({
      from: "Campus Ride <no-reply@campusride.local>",
      to: "alice@university.edu",
      subject: "Welcome",
      html: "<p>Hello</p>",
    });
  });

  it("throws for missing booking confirmation data and handles no-op ride-start jobs", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    workerState.bookingFindUnique.mockResolvedValue(null);
    workerState.bookingFindMany.mockResolvedValue([]);

    const module = await import("./emailWorkers");
    const worker = module.startEmailWorker() as unknown as FakeWorker;

    await expect(
      worker.processor({
        name: "bookingConfirmed",
        data: { bookingId: "booking-404" },
      }),
    ).rejects.toThrow("Booking booking-404 not found");

    await worker.processor({
      name: "rideStarted",
      data: { rideId: "ride-empty" },
    });

    expect(logSpy).toHaveBeenCalledWith("[emailWorker] no confirmed bookings for ride ride-empty");
    expect(workerState.sendMail).not.toHaveBeenCalled();
  });

  it("logs unknown jobs plus completed and failed worker events", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const module = await import("./emailWorkers");
    const worker = module.startEmailWorker() as unknown as FakeWorker;

    await worker.processor({
      name: "mysteryJob",
      data: {},
    });

    worker.handlers.completed?.({ name: "welcomeEmail", id: "job-1" });
    worker.handlers.failed?.({ name: "welcomeEmail" }, new Error("smtp failed"));

    expect(warnSpy).toHaveBeenCalledWith("[emailWorker] unknown job type: mysteryJob");
    expect(logSpy).toHaveBeenCalledWith("[emailWorker] job completed: welcomeEmail (job-1)");
    expect(errorSpy).toHaveBeenCalledWith("[emailWorker] job failed: welcomeEmail", "smtp failed");
  });
});
