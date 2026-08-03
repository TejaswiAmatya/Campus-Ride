import type { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { emailQueue } from "../lib/emailQueue";
import {
  confirmAuthSignup,
  registerAuthUser,
  supabaseAdmin,
  supabaseAuth,
} from "../lib/supabase";
import { AppError, getBlockedAccountError } from "../middleware/error";
import {
  ConfirmSignupSchema,
  ConfirmSignupSessionSchema,
  LoginSchema,
  RegisterSchema,
} from "./schemas";

type AuthUserProfile = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
};

function getAuthUserMetadataValue(
  metadata: unknown,
  key: "name" | "phone",
): string | null {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const value = (metadata as Record<string, unknown>)[key];
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function ensureAuthUserProfile(args: {
  id: string;
  email: string | null | undefined;
  metadata: unknown;
}): Promise<AuthUserProfile> {
  const email = args.email?.toLowerCase().trim();
  if (!email) {
    throw new AppError(
      "AUTH_PROVIDER_ERROR",
      "Authentication user is missing an email address",
      502,
    );
  }

  const existingUser = await prisma.user.findUnique({
    where: { id: args.id },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
    },
  });

  if (existingUser) {
    return existingUser;
  }

  const name = getAuthUserMetadataValue(args.metadata, "name");
  if (!name) {
    throw new AppError(
      "AUTH_PROVIDER_ERROR",
      "Authentication user is missing a display name",
      502,
    );
  }

  const phone = getAuthUserMetadataValue(args.metadata, "phone");

  return prisma.user.create({
    data: {
      id: args.id,
      email,
      name,
      ...(phone ? { phone } : {}),
    },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
    },
  });
}

function isEmailNotConfirmedError(
  error: { code?: string; message?: string } | null | undefined,
): boolean {
  if (!error) {
    return false;
  }

  const code = error.code?.toLowerCase() ?? "";
  const message = error.message?.toLowerCase() ?? "";

  return code.includes("email_not_confirmed") || message.includes("email not confirmed");
}

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

    const { error } = await registerAuthUser({
      email,
      password: body.password,
      name: body.name,
      phone: body.phone,
    });

    if (error) {
      throw new AppError(
        "AUTH_PROVIDER_ERROR",
        error.message ?? "Unable to create authentication user",
        502,
      );
    }

    res.status(202).json({
      data: {
        email,
        requiresEmailConfirmation: true,
      },
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/confirm-signup
export async function confirmSignup(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = ConfirmSignupSchema.parse(req.body);
    const { data, error } = await confirmAuthSignup(body.tokenHash);

    if (error || !data.user) {
      throw new AppError(
        "INVALID_CONFIRMATION_TOKEN",
        error?.message ?? "Unable to confirm signup",
        400,
      );
    }

    const user = await ensureAuthUserProfile({
      id: data.user.id,
      email: data.user.email,
      metadata: data.user.user_metadata,
    });

    try {
      await emailQueue.welcomeEmail(user.id, user.email);
    } catch (queueErr) {
      console.error("[auth/confirm-signup] welcomeEmail queue failed", {
        userId: user.id,
        email: user.email,
        error: queueErr,
      });
    }

    res.status(200).json({
      data: {
        email: user.email,
        status: "confirmed",
      },
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/confirm-signup/session
export async function confirmSignupSession(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = ConfirmSignupSessionSchema.parse(req.body);
    const { data, error } = await supabaseAdmin.auth.getUser(body.accessToken);

    if (error || !data.user) {
      throw new AppError(
        "INVALID_CONFIRMATION_TOKEN",
        error?.message ?? "Unable to confirm signup",
        400,
      );
    }

    const user = await ensureAuthUserProfile({
      id: data.user.id,
      email: data.user.email,
      metadata: data.user.user_metadata,
    });

    try {
      await emailQueue.welcomeEmail(user.id, user.email);
    } catch (queueErr) {
      console.error("[auth/confirm-signup-session] welcomeEmail queue failed", {
        userId: user.id,
        email: user.email,
        error: queueErr,
      });
    }

    res.status(200).json({
      data: {
        email: user.email,
        status: "confirmed",
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
    const body = LoginSchema.parse(req.body);
    const email = body.email.toLowerCase();

    const { data, error } = await supabaseAuth.auth.signInWithPassword({
      email,
      password: body.password,
    });

    if (isEmailNotConfirmedError(error)) {
      throw new AppError(
        "EMAIL_NOT_CONFIRMED",
        "Please confirm your email before signing in.",
        403,
      );
    }

    if (error || !data?.session || !data.user) {
      throw new AppError(
        "INVALID_CREDENTIALS",
        "Email or password is incorrect",
        401,
      );
    }

    const user = await ensureAuthUserProfile({
      id: data.user.id,
      email: data.user.email,
      metadata: data.user.user_metadata,
    });

    const moderationState = await prisma.user.findUnique({
      where: { id: user.id },
      select: { accountStatus: true, suspendedUntil: true },
    });

    if (!moderationState) {
      throw new AppError("UNAUTHORIZED", "Authenticated user not found", 401);
    }

    const blockedAccountError = getBlockedAccountError({
      accountStatus:
        moderationState.accountStatus === "SUSPENDED" &&
        hasSuspensionExpired(moderationState.suspendedUntil)
          ? "ACTIVE"
          : moderationState.accountStatus,
      suspendedUntil: moderationState.suspendedUntil,
    });

    if (blockedAccountError) {
      throw blockedAccountError;
    }

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
