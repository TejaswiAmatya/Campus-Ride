import type { Request, Response, NextFunction } from "express";
import type { Multer } from "multer";
import { prisma } from "../lib/prisma";
import { supabaseAdmin } from "../lib/supabase";

export interface AuthUser {
  id: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      file?: Multer.File;
      files?: Multer.File[] | { [fieldname: string]: Multer.File[] };
    }
  }
}

/**
 * requireAuth — validates the Bearer JWT with Supabase Auth.
 *
 * If the token is valid and user exists in Prisma, `req.user` is populated
 * with DB-backed role data.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Missing or malformed Authorization header",
      },
    });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) {
      res.status(401).json({
        error: { code: "UNAUTHORIZED", message: "Invalid or expired token" },
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: data.user.id },
      select: { role: true },
    });

    if (!user) {
      res.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "Authenticated user not found",
        },
      });
      return;
    }

    req.user = {
      id: data.user.id,
      role: user.role,
    };

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * requireRole — must be used AFTER requireAuth in the middleware chain.
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res
        .status(401)
        .json({
          error: { code: "UNAUTHORIZED", message: "Not authenticated" },
        });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res
        .status(403)
        .json({
          error: { code: "FORBIDDEN", message: "Insufficient permissions" },
        });
      return;
    }

    next();
  };
}
