import type { Request, Response, NextFunction } from "express";
import { RegisterSchema, LoginSchema } from "./schemas";
import { prisma } from "../lib/prisma";
import { createAuthUser, deleteAuthUser, supabaseAuth } from "../lib/supabase";
import { AppError, getBlockedAccountError } from "../middleware/error";
import { emailQueue } from "../lib/emailQueue";
// POST /api/auth/register
export async function register(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = RegisterSchema.parse(req.body);
    const email = body.email.toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existingUser) {
      throw new AppError("CONFLICT", "Email is already registered", 409);
    }

    // create Supabase auth user
    const { data, error } = await createAuthUser(email, body.password);
    if (error || !data?.user) {
      throw new AppError(
        "AUTH_PROVIDER_ERROR",
        error?.message ?? "Unable to create authentication user",
        502,
      );
    }

    let user;
    try {
      // create new user
      user = await prisma.user.create({
        data: { id: data.user.id, email, name: body.name, phone: body.phone },
      });
    } catch (prismaErr) {
      // Compensate Supabase user creation to avoid orphaned auth users.
      const { error: rollbackError } = await deleteAuthUser(data.user.id);
      if (rollbackError) {
        console.error(
          "[auth/register] Failed to rollback Supabase user after Prisma failure",
          {
            supabaseUserId: data.user.id,
            rollbackError: rollbackError.message,
          },
        );
      }
      throw prismaErr;
    }

    // TODO: enqueue welcome email
    try {
      await emailQueue.welcomeEmail(user.id, user.email);
    } catch (queueErr) {
      console.error("[auth/register] welcomeEmail queue failed", {
        userId: user.id,
        email: user.email,
        error: queueErr,
      });
    }

    res.status(201).json({
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/login
export async function login(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // validate the request body
    const body = LoginSchema.parse(req.body);
    const email = body.email.toLowerCase();

    const { data, error } = await supabaseAuth.auth.signInWithPassword({
      email,
      password: body.password,
    });

    // Invalid credentials
    if (error || !data?.session) {
      throw new AppError(
        "INVALID_CREDENTIALS",
        "Email or password is incorrect",
        401,
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { accountStatus: true, suspendedUntil: true },
    });

    if (!user) {
      throw new AppError("UNAUTHORIZED", "Authenticated user not found", 401);
    }

    const blockedAccountError = getBlockedAccountError({
      accountStatus:
        user.accountStatus === "SUSPENDED" && hasSuspensionExpired(user.suspendedUntil)
          ? "ACTIVE"
          : user.accountStatus,
      suspendedUntil: user.suspendedUntil,
    });

    if (blockedAccountError) {
      throw blockedAccountError;
    }

    // return the access_token and refresh_token
    const session = data.session;
    res.status(200).json({
      data: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      },
    });
  } catch (err) {
    next(err);
  }
}

function hasSuspensionExpired(suspendedUntil: Date | null): boolean {
  return suspendedUntil !== null && suspendedUntil.getTime() <= Date.now();
}
