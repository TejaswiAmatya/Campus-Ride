import { beforeEach, describe, expect, it, vi } from "vitest";

const socketMocks = vi.hoisted(() => ({
  isRideParticipant: vi.fn(),
  chatCreate: vi.fn(),
  servers: [] as FakeServer[],
}));

class FakeServer {
  public handlers: Record<string, (...args: any[]) => void> = {};
  public emits: Array<{ room: string | null; event: string; payload: unknown }> = [];

  constructor(
    public readonly httpServer: unknown,
    public readonly options: unknown,
  ) {}

  on(event: string, handler: (...args: any[]) => void) {
    this.handlers[event] = handler;
    return this;
  }

  to(room: string) {
    return {
      emit: (event: string, payload: unknown) => {
        this.emits.push({ room, event, payload });
      },
    };
  }

  emit(event: string, payload: unknown) {
    this.emits.push({ room: null, event, payload });
  }

  simulateConnection(socket: ReturnType<typeof createSocket>) {
    this.handlers.connection?.(socket);
  }
}

function createSocket(id = "socket-1") {
  const handlers: Record<string, (...args: any[]) => unknown> = {};

  return {
    id,
    data: {} as Record<string, unknown>,
    join: vi.fn(),
    on: vi.fn((event: string, handler: (...args: any[]) => unknown) => {
      handlers[event] = handler;
    }),
    emitFromClient(event: string, payload: unknown) {
      return handlers[event]?.(payload);
    },
  };
}

vi.mock("socket.io", () => ({
  Server: class extends FakeServer {
    constructor(httpServer: unknown, options: unknown) {
      super(httpServer, options);
      socketMocks.servers.push(this);
    }
  },
}));

vi.mock("../chat/controller", () => ({
  isRideParticipant: socketMocks.isRideParticipant,
}));

vi.mock("./prisma", () => ({
  prisma: {
    chatMessage: {
      create: socketMocks.chatCreate,
    },
  },
}));

describe("socket integration", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    socketMocks.servers.length = 0;
    process.env.CORS_ORIGIN = "http://localhost:5173";
  });

  it("throws before initialization and then wires rooms plus notification helpers", async () => {
    const module = await import("./socket");

    expect(() => module.getIO()).toThrow("Socket.IO has not been initialized");

    const io = module.initSocket({} as never) as unknown as FakeServer;
    const socket = createSocket("socket-a");
    io.simulateConnection(socket);

    socket.emitFromClient("join:user", { userId: "user-1" });
    socket.emitFromClient("join:ride", { rideId: "ride-1" });

    expect(socket.join).toHaveBeenNthCalledWith(1, "user:user-1");
    expect(socket.join).toHaveBeenNthCalledWith(2, "ride:ride-1");
    expect(socket.data.userId).toBe("user-1");

    module.notifyBookingStatus("user-1", {
      bookingId: "booking-1",
      rideId: "ride-1",
      status: "CONFIRMED",
      updatedAt: "2026-05-10T08:30:00.000Z",
    });
    module.notifyAnnouncement({
      id: "announcement-1",
      subject: "Heads up",
      message: "Maintenance tonight",
      createdAt: "2026-05-10T08:30:00.000Z",
    });

    expect(io.emits).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          room: "user:user-1",
          event: "booking:status",
        }),
        expect.objectContaining({
          room: null,
          event: "announcement",
        }),
      ]),
    );
  });

  it("broadcasts driver location updates only for valid coordinates", async () => {
    const module = await import("./socket");
    const io = module.initSocket({} as never) as unknown as FakeServer;
    const socket = createSocket("socket-b");
    io.simulateConnection(socket);

    socket.emitFromClient("driver:locationUpdate", {
      rideId: "ride-2",
      lat: 58.9,
      lng: 5.71,
    });
    socket.emitFromClient("driver:locationUpdate", {
      rideId: "ride-2",
      lat: Number.NaN,
      lng: 5.71,
    });

    const locationEmits = io.emits.filter((entry) => entry.event === "driver:location");
    expect(locationEmits).toHaveLength(1);
    expect(locationEmits[0]).toMatchObject({
      room: "ride:ride-2",
      event: "driver:location",
    });
  });

  it("emits persisted chat messages only for authorized ride participants", async () => {
    socketMocks.isRideParticipant.mockResolvedValue(true);
    socketMocks.chatCreate.mockResolvedValue({
      senderId: "user-9",
      text: "On my way",
      createdAt: new Date("2026-05-10T08:30:00.000Z"),
      sender: {
        id: "user-9",
        name: "Taylor",
        avatarPath: "https://example.com/avatar.png",
      },
    });

    const module = await import("./socket");
    const io = module.initSocket({} as never) as unknown as FakeServer;
    const socket = createSocket("socket-c");
    io.simulateConnection(socket);
    socket.emitFromClient("join:user", { userId: "user-9" });

    await socket.emitFromClient("chat:message", {
      rideId: "ride-9",
      text: "  On my way  ",
    });

    expect(socketMocks.chatCreate).toHaveBeenCalledWith({
      data: { rideId: "ride-9", senderId: "user-9", text: "On my way" },
      include: {
        sender: { select: { id: true, name: true, avatarPath: true } },
      },
    });
    expect(io.emits).toContainEqual({
      room: "ride:ride-9",
      event: "chat:message",
      payload: {
        rideId: "ride-9",
        senderId: "user-9",
        senderName: "Taylor",
        senderAvatarPath: "https://example.com/avatar.png",
        text: "On my way",
        createdAt: "2026-05-10T08:30:00.000Z",
      },
    });
  });

  it("suppresses unauthorized chat messages and logs handler failures", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    socketMocks.isRideParticipant.mockResolvedValue(false);

    const module = await import("./socket");
    const io = module.initSocket({} as never) as unknown as FakeServer;
    const socket = createSocket("socket-d");
    io.simulateConnection(socket);
    socket.emitFromClient("join:user", { userId: "user-10" });

    await socket.emitFromClient("chat:message", {
      rideId: "ride-10",
      text: "Hello",
    });

    expect(socketMocks.chatCreate).not.toHaveBeenCalled();
    expect(io.emits.find((entry) => entry.event === "chat:message")).toBeUndefined();

    socketMocks.isRideParticipant.mockResolvedValueOnce(true);
    socketMocks.chatCreate.mockRejectedValueOnce(new Error("db failed"));

    await socket.emitFromClient("chat:message", {
      rideId: "ride-10",
      text: "Hello again",
    });

    expect(errorSpy).toHaveBeenCalled();
  });
});
