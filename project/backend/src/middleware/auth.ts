import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthUser {
  sub: string    
  email: string
  role?: string  
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
    }
  }
}

/**
 * requireAuth — verifies the Bearer JWT issued by Supabase Auth.
 *
 * If the token is valid, `req.user` is populated with the decoded payload.
 * Returns 401 if the header is missing or the token is invalid/expired.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Missing or malformed Authorization header' },
    })
    return
  }

  const token = authHeader.slice(7)
  const secret = process.env.SUPABASE_JWT_SECRET

  if (!secret) {
    res.status(500).json({
      error: { code: 'SERVER_ERROR', message: 'JWT secret is not configured' },
    })
    return
  }

  try {
    const payload = jwt.verify(token, secret) as AuthUser
    req.user = payload
    next()
  } catch {
    res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
    })
  }
}

/**
 * requireRole — must be used AFTER requireAuth in the middleware chain.
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } })
      return
    }
    if (!roles.includes(req.user.role ?? '')) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } })
      return
    }
    next()
  }
}
