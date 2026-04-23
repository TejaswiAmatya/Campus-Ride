import { z } from 'zod'

const UNIVERSITY_EMAIL_RE = /@[a-zA-Z0-9.-]+\.(edu|no)$/i

export const RegisterSchema = z.object({
  email: z
    .string()
    .email('Must be a valid email address')
    .refine((e) => UNIVERSITY_EMAIL_RE.test(e), {
      message: 'Must be a university email (.edu or .no)',
    }),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2).max(100),
  phone: z.string().optional(),
})

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const UpdateProfileSchema = z
  .object({
    name: z.string().min(2).max(100).optional(),
    phone: z.string().optional(),
    avatarPath: z.string().url().optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: 'At least one field must be provided',
  })

const VehicleInfoSchema = z.object({
  make: z.string().min(1),
  model: z.string().min(1),
  year: z
    .number()
    .int()
    .min(1990)
    .max(new Date().getFullYear() + 1),
  colour: z.string().min(1),
  plateNumber: z.string().min(1),
})

export const DriverApplicationSchema = z.object({
  vehicle: z.preprocess((value) => {
    if (typeof value !== 'string') return value

    try {
      return JSON.parse(value)
    } catch {
      return value
    }
  }, VehicleInfoSchema),
})

export type RegisterInput = z.infer<typeof RegisterSchema>
export type LoginInput = z.infer<typeof LoginSchema>
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>
export type DriverApplicationInput = z.infer<typeof DriverApplicationSchema>
