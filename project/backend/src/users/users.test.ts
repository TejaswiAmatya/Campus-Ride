import { describe, it, expect } from 'vitest'
import { RegisterSchema, LoginSchema, UpdateProfileSchema, DriverApplicationSchema } from './schemas'

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

describe('UpdateProfileSchema', () => {
  it('accepts a name-only update', () => {
    expect(UpdateProfileSchema.safeParse({ name: 'Alice B' }).success).toBe(true)
  })

  it('rejects an empty object (nothing to update)', () => {
    expect(UpdateProfileSchema.safeParse({}).success).toBe(false)
  })

  it('rejects an invalid avatar URL', () => {
    expect(UpdateProfileSchema.safeParse({ avatarUrl: 'not-a-url' }).success).toBe(false)
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
