import type { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'

export const ACCOUNT_STATUSES = ['ACTIVE', 'WARNED', 'SUSPENDED', 'BANNED', 'DEACTIVATED'] as const

export type AccountStatus = (typeof ACCOUNT_STATUSES)[number]

/** Throw this from any controller to produce a structured HTTP error response. */
export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly message: string,
    public readonly statusCode: number = 400,
    public readonly details?: unknown,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

type BlockedAccountErrorInput = {
  accountStatus: AccountStatus
  suspendedUntil?: Date | string | null
}

/**
 * Returns the standard auth-blocking error for moderated accounts.
 * ACTIVE and WARNED are allowed to continue, so they return null.
 */
export function getBlockedAccountError({
  accountStatus,
  suspendedUntil,
}: BlockedAccountErrorInput): AppError | null {
  if (accountStatus === 'SUSPENDED') {
    return new AppError(
      'ACCOUNT_SUSPENDED',
      'Your account is suspended. Please try again later or contact support.',
      403,
      suspendedUntil
        ? { suspendedUntil: toIsoString(suspendedUntil) }
        : undefined,
    )
  }

  if (accountStatus === 'BANNED') {
    return new AppError(
      'ACCOUNT_BANNED',
      'Your account has been banned. Please contact support if you think this is a mistake.',
      403,
    )
  }

  if (accountStatus === 'DEACTIVATED') {
    return new AppError(
      'ACCOUNT_DEACTIVATED',
      'This account has been closed and is no longer available.',
      403,
    )
  }

  return null
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Zod validation errors → 422
  if (err instanceof ZodError) {
    res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: err.flatten().fieldErrors,
      },
    })
    return
  }

  // Known application errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details === undefined ? {} : { details: err.details }),
      },
    })
    return
  }

  // Prisma: unique constraint violation → 409
  if (isPrismaError(err, 'P2002')) {
    res.status(409).json({
      error: { code: 'CONFLICT', message: 'A record with that value already exists' },
    })
    return
  }

  // Prisma: record not found → 404
  if (isPrismaError(err, 'P2025')) {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Record not found' },
    })
    return
  }

  // Prisma: transaction conflict (e.g. serializable retry)
  if (isPrismaError(err, 'P2034')) {
    res.status(409).json({
      error: { code: 'TRANSACTION_CONFLICT', message: 'Please try again' },
    })
    return
  }

  // Fallback
  console.error('[errorHandler] Unhandled error:', err)
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
  })
}

function isPrismaError(err: unknown, code: string): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as Record<string, unknown>).code === code
  )
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value
}
