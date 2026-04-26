import { describe, it, expect } from 'vitest'
import {
  RegisterSchema,
  LoginSchema,
  UpdateProfileSchema,
  DriverApplicationSchema,
  AccountStatusSchema,
  MeResponseSchema,
  BlockedAuthErrorSchema,
} from './schemas'

describe('RegisterSchema', () => {
  const valid = { email: 'alice@university.edu', password: 'Password1!', name: 'Alice' }

  it('accepts a valid .edu email', () => {
    expect(RegisterSchema.safeParse(valid).success).toBe(true)
  })

  it('rejects a .ac.uk university email', () => {
    expect(
      RegisterSchema.safeParse({ ...valid, email: 'bob@imperial.ac.uk' }).success,
    ).toBe(false)
  })

  it('accepts a valid .no email', () => {
    expect(
      RegisterSchema.safeParse({ ...valid, email: 'bob@ntnu.no' }).success,
    ).toBe(true)
  })

  it('rejects a non-university email', () => {
    const result = RegisterSchema.safeParse({ ...valid, email: 'user@gmail.com' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.email).toBeDefined()
    }
  })

  it('rejects a password shorter than 8 characters', () => {
    const result = RegisterSchema.safeParse({ ...valid, password: 'short' })
    expect(result.success).toBe(false)
  })

  it('rejects a missing name', () => {
    const result = RegisterSchema.safeParse({ ...valid, name: '' })
    expect(result.success).toBe(false)
  })

  it('accepts an optional phone number', () => {
    expect(
      RegisterSchema.safeParse({ ...valid, phone: '+4712345678' }).success,
    ).toBe(true)
  })
})

describe('LoginSchema', () => {
  it('accepts valid credentials', () => {
    expect(
      LoginSchema.safeParse({ email: 'alice@university.edu', password: 'pass' }).success,
    ).toBe(true)
  })

  it('rejects an empty password', () => {
    expect(
      LoginSchema.safeParse({ email: 'alice@university.edu', password: '' }).success,
    ).toBe(false)
  })
})

describe('AccountStatusSchema', () => {
  it('accepts the supported moderation states', () => {
    expect(AccountStatusSchema.safeParse('ACTIVE').success).toBe(true)
    expect(AccountStatusSchema.safeParse('WARNED').success).toBe(true)
    expect(AccountStatusSchema.safeParse('SUSPENDED').success).toBe(true)
    expect(AccountStatusSchema.safeParse('BANNED').success).toBe(true)
  })

  it('rejects unsupported moderation states', () => {
    expect(AccountStatusSchema.safeParse('DISABLED').success).toBe(false)
  })
})

describe('MeResponseSchema', () => {
  it('accepts the flat hydration payload with moderation fields', () => {
    expect(
      MeResponseSchema.safeParse({
        id: 'user-1',
        email: 'alice@university.edu',
        name: 'Alice',
        role: 'PASSENGER',
        mustChangePassword: true,
        accountStatus: 'ACTIVE',
        suspendedUntil: null,
        avatarPath: null,
        driverStatus: null,
        createdAt: '2026-04-26T12:00:00.000Z',
      }).success,
    ).toBe(true)
  })
})

describe('BlockedAuthErrorSchema', () => {
  it('accepts the suspended account error shape', () => {
    expect(
      BlockedAuthErrorSchema.safeParse({
        error: {
          code: 'ACCOUNT_SUSPENDED',
          message: 'Your account is suspended.',
          details: {
            suspendedUntil: '2026-05-01T12:00:00.000Z',
          },
        },
      }).success,
    ).toBe(true)
  })

  it('accepts the banned account error shape', () => {
    expect(
      BlockedAuthErrorSchema.safeParse({
        error: {
          code: 'ACCOUNT_BANNED',
          message: 'Your account has been banned.',
        },
      }).success,
    ).toBe(true)
  })
})

describe('UpdateProfileSchema', () => {
  it('accepts a name-only update', () => {
    expect(UpdateProfileSchema.safeParse({ name: 'Alice B' }).success).toBe(true)
  })

  it('rejects an empty object (nothing to update)', () => {
    expect(UpdateProfileSchema.safeParse({}).success).toBe(false)
  })

  it('accepts a non-URL avatar path', () => {
    expect(UpdateProfileSchema.safeParse({ avatarPath: 'user-1/avatar-123.jpg' }).success).toBe(true)
  })
})

describe('DriverApplicationSchema', () => {
  const validVehicle = {
    make: 'Toyota',
    model: 'Prius',
    year: 2020,
    colour: 'Silver',
    plateNumber: 'AB12345',
  }

  it('accepts a valid application', () => {
    expect(
      DriverApplicationSchema.safeParse({
        vehicle: JSON.stringify(validVehicle),
      }).success,
    ).toBe(true)
  })

  it('rejects a missing vehicle payload', () => {
    expect(
      DriverApplicationSchema.safeParse({}).success,
    ).toBe(false)
  })

  it('rejects a vehicle year before 1990', () => {
    expect(
      DriverApplicationSchema.safeParse({
        vehicle: JSON.stringify({ ...validVehicle, year: 1985 }),
      }).success,
    ).toBe(false)
  })

  it('rejects invalid vehicle JSON', () => {
    expect(
      DriverApplicationSchema.safeParse({
        vehicle: '{bad json}',
      }).success,
    ).toBe(false)
  })
})
