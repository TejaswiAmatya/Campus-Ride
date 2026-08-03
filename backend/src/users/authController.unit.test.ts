import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";
import { AppError } from "../middleware/error";
import {
  confirmSignup,
  confirmSignupSession,
  login,
  register,
} from "./authController";

const mocks = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  userCreate: vi.fn(),
  registerAuthUser: vi.fn(),
  confirmAuthSignup: vi.fn(),
  getUser: vi.fn(),
  signInWithPassword: vi.fn(),
  welcomeEmail: vi.fn(),
}));

vi.mock("../lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mocks.userFindUnique,
      create: mocks.userCreate,
    },
  },
}));

vi.mock("../lib/supabase", () => ({
  registerAuthUser: mocks.registerAuthUser,
  confirmAuthSignup: mocks.confirmAuthSignup,
  supabaseAdmin: {
    auth: {
      getUser: mocks.getUser,
    },
  },
  supabaseAuth: {
    auth: {
      signInWithPassword: mocks.signInWithPassword,
    },
  },
}));

vi.mock("../lib/emailQueue", () => ({
  emailQueue: {
    welcomeEmail: mocks.welcomeEmail,
  },
}));

function makeResponse() {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  };
}

describe("authController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.welcomeEmail.mockResolvedValue(undefined);
  });

  it("register returns 202 and defers local user creation until confirmation", async () => {
    mocks.userFindUnique.mockResolvedValue(null);
    mocks.registerAuthUser.mockResolvedValue({
      data: { user: { id: "auth-user-1" } },
      error: null,
    });

    const req = {
      body: {
        email: "Alice@University.edu",
        password: "Password123!",
        name: "Alice",
        phone: "+47 123 45 678",
      },
    } as Request;
    const res = makeResponse();
    const next = vi.fn();

    await register(req, res as unknown as Response, next as NextFunction);

    expect(mocks.registerAuthUser).toHaveBeenCalledWith({
      email: "alice@university.edu",
      password: "Password123!",
      name: "Alice",
      phone: "+47 123 45 678",
    });
    expect(mocks.userCreate).not.toHaveBeenCalled();
    expect(mocks.welcomeEmail).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(202);
    expect(res.json).toHaveBeenCalledWith({
      data: {
        email: "alice@university.edu",
        requiresEmailConfirmation: true,
      },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("confirmSignup creates the Prisma user and queues welcome email", async () => {
    mocks.confirmAuthSignup.mockResolvedValue({
      data: {
        user: {
          id: "auth-user-2",
          email: "alice@university.edu",
          user_metadata: {
            name: "Alice",
            phone: "+47 123 45 678",
          },
        },
      },
      error: null,
    });
    mocks.userFindUnique.mockResolvedValue(null);
    mocks.userCreate.mockResolvedValue({
      id: "auth-user-2",
      email: "alice@university.edu",
      name: "Alice",
      phone: "+47 123 45 678",
    });

    const req = {
      body: {
        tokenHash: "token-hash",
      },
    } as Request;
    const res = makeResponse();
    const next = vi.fn();

    await confirmSignup(req, res as unknown as Response, next as NextFunction);

    expect(mocks.confirmAuthSignup).toHaveBeenCalledWith("token-hash");
    expect(mocks.userCreate).toHaveBeenCalledWith({
      data: {
        id: "auth-user-2",
        email: "alice@university.edu",
        name: "Alice",
        phone: "+47 123 45 678",
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
      },
    });
    expect(mocks.welcomeEmail).toHaveBeenCalledWith(
      "auth-user-2",
      "alice@university.edu",
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      data: {
        email: "alice@university.edu",
        status: "confirmed",
      },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("confirmSignupSession provisions the Prisma user from a confirmed auth session", async () => {
    mocks.getUser.mockResolvedValue({
      data: {
        user: {
          id: "auth-user-4",
          email: "alice@university.edu",
          user_metadata: {
            name: "Alice",
            phone: "+47 123 45 678",
          },
        },
      },
      error: null,
    });
    mocks.userFindUnique.mockResolvedValue(null);
    mocks.userCreate.mockResolvedValue({
      id: "auth-user-4",
      email: "alice@university.edu",
      name: "Alice",
      phone: "+47 123 45 678",
    });

    const req = {
      body: {
        accessToken: "session-access-token",
      },
    } as Request;
    const res = makeResponse();
    const next = vi.fn();

    await confirmSignupSession(
      req,
      res as unknown as Response,
      next as NextFunction,
    );

    expect(mocks.getUser).toHaveBeenCalledWith("session-access-token");
    expect(mocks.userCreate).toHaveBeenCalled();
    expect(mocks.welcomeEmail).toHaveBeenCalledWith(
      "auth-user-4",
      "alice@university.edu",
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      data: {
        email: "alice@university.edu",
        status: "confirmed",
      },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("login maps unconfirmed-email errors to EMAIL_NOT_CONFIRMED", async () => {
    mocks.signInWithPassword.mockResolvedValue({
      data: {
        session: null,
        user: null,
      },
      error: {
        message: "Email not confirmed",
      },
    });

    const req = {
      body: {
        email: "alice@university.edu",
        password: "Password123!",
      },
    } as Request;
    const res = makeResponse();
    const next = vi.fn();

    await login(req, res as unknown as Response, next as NextFunction);

    expect(next).toHaveBeenCalledTimes(1);
    const error = next.mock.calls[0]?.[0];
    expect(error).toBeInstanceOf(AppError);
    expect(error.code).toBe("EMAIL_NOT_CONFIRMED");
    expect(error.statusCode).toBe(403);
  });

  it("login backfills the local user profile after confirmed auth", async () => {
    mocks.signInWithPassword.mockResolvedValue({
      data: {
        session: {
          access_token: "access-token",
          refresh_token: "refresh-token",
        },
        user: {
          id: "auth-user-3",
          email: "alice@university.edu",
          user_metadata: {
            name: "Alice",
          },
        },
      },
      error: null,
    });
    mocks.userFindUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        accountStatus: "ACTIVE",
        suspendedUntil: null,
      });
    mocks.userCreate.mockResolvedValue({
      id: "auth-user-3",
      email: "alice@university.edu",
      name: "Alice",
      phone: null,
    });

    const req = {
      body: {
        email: "alice@university.edu",
        password: "Password123!",
      },
    } as Request;
    const res = makeResponse();
    const next = vi.fn();

    await login(req, res as unknown as Response, next as NextFunction);

    expect(mocks.userCreate).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      data: {
        access_token: "access-token",
        refresh_token: "refresh-token",
      },
    });
    expect(next).not.toHaveBeenCalled();
  });
});
