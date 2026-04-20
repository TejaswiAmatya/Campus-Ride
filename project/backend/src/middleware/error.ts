import type { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'

/** Throw this from any controller to produce a structured HTTP error response. */
export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly message: string,
    public readonly statusCode: number = 400,
  ) {
    super(message)
    this.name = 'AppError'
  }
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
      error: { code: err.code, message: err.message },
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
