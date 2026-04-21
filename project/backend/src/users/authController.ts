import type { Request, Response, NextFunction } from "express";
import { RegisterSchema, LoginSchema } from "./schemas";
import { prisma } from "../lib/prisma";
import { supabaseAdmin } from "../lib/supabase";
import { emailQueue } from "../lib/emailQueue";
// POST /api/auth/register
export async function register(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = RegisterSchema.parse(req.body);

    // create Supabase auth user
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
    });
    if (error || !data?.user) {
      res.status(500).json({
        error: error?.message,
        message: "User not created",
      });
      return;
    }

    // create new user
    const newUser = await prisma.user.create({
      data: {
        id: data.user.id,
        email: body.email,
        name: body.name,
        phone: body.phone,
      },
    });

    // TODO: enqueue welcome email
    // await emailQueue.add('welcome', { recipientEmail: body.email, payload: { name: body.name } })
    await emailQueue.welcomeEmail(newUser.id, newUser.email);
    res.status(201).json({ message: "TODO: register user", email: body.email });
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

    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    });

    // Invalid credentials
    if (error || !data?.session) {
      res.status(401).json({
        error: "INVALID_CREDENTIALS",
        message: "Email or password is incorrect",
      });
      return;
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
