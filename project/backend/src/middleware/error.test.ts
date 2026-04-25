import { describe, expect, it, vi } from 'vitest'
import type { Request, Response } from 'express'

import { AppError, errorHandler, getBlockedAccountError } from './error'

function makeResponse() {
  let statusCode = 200
  let body: unknown

  const res = {
    status(code: number) {
      statusCode = code
      return this
    },
    json(payload: unknown) {
      body = payload
      return this
    },
  } as Response

  return {
    res,
    getStatusCode: () => statusCode,
    getBody: () => body,
  }
}

describe('getBlockedAccountError', () => {
  it('returns null for ACTIVE and WARNED users', () => {
    expect(getBlockedAccountError({ accountStatus: 'ACTIVE' })).toBeNull()
    expect(getBlockedAccountError({ accountStatus: 'WARNED' })).toBeNull()
  })

  it('returns a suspended account error with suspendedUntil details', () => {
    const suspendedUntil = '2026-05-01T12:00:00.000Z'

    const error = getBlockedAccountError({
      accountStatus: 'SUSPENDED',
      suspendedUntil,
    })

    expect(error).toBeInstanceOf(AppError)
    expect(error?.code).toBe('ACCOUNT_SUSPENDED')
    expect(error?.statusCode).toBe(403)
    expect(error?.details).toEqual({ suspendedUntil })
  })

  it('returns a banned account error without details', () => {
    const error = getBlockedAccountError({ accountStatus: 'BANNED' })

    expect(error).toBeInstanceOf(AppError)
    expect(error?.code).toBe('ACCOUNT_BANNED')
    expect(error?.statusCode).toBe(403)
    expect(error?.details).toBeUndefined()
  })
})

describe('errorHandler', () => {
  it('includes error details for AppError responses', () => {
    const { res, getStatusCode, getBody } = makeResponse()

    errorHandler(
      new AppError('ACCOUNT_SUSPENDED', 'Your account is suspended.', 403, {
        suspendedUntil: '2026-05-01T12:00:00.000Z',
      }),
      {} as Request,
      res,
      vi.fn(),
    )

    expect(getStatusCode()).toBe(403)
    expect(getBody()).toEqual({
      error: {
        code: 'ACCOUNT_SUSPENDED',
        message: 'Your account is suspended.',
        details: { suspendedUntil: '2026-05-01T12:00:00.000Z' },
      },
    })
  })
})
