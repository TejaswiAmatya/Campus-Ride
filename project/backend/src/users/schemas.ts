import { z } from 'zod'

const UNIVERSITY_EMAIL_RE = /@[a-zA-Z0-9.-]+\.(edu|no)$/i

export const AccountStatusSchema = z.enum([
  'ACTIVE',
  'WARNED',
  'SUSPENDED',
  'BANNED',
])

export const AcademicRoleSchema = z.enum([
  'STUDENT',
  'STAFF',
])

export const AcademicVerificationStatusSchema = z.enum([
  'NOT_SUBMITTED',
  'PENDING',
  'VERIFIED',
  'REJECTED',
])

export const ModerationStateSchema = z.object({
  accountStatus: AccountStatusSchema,
  suspendedUntil: z.string().datetime().nullable(),
})

export const AcademicVerificationStateSchema = z.object({
  academicRole: AcademicRoleSchema.nullable(),
  academicVerificationStatus: AcademicVerificationStatusSchema,
  academicIdPath: z.string().nullable(),
  academicVerifiedAt: z.string().datetime().nullable(),
  academicRejectionReason: z.string().nullable(),
})

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
    avatarPath: z.string().optional(),
    bio: z.string().nullable().optional(),
    homeAddress: z.string().nullable().optional(),
    homeLat: z.number().nullable().optional(),
    homeLng: z.number().nullable().optional(),
    campusAddress: z.string().nullable().optional(),
    campusLat: z.number().nullable().optional(),
    campusLng: z.number().nullable().optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: 'At least one field must be provided',
  })

export const ProfileFieldsSchema = z.object({
  phone: z.string().nullable(),
  bio: z.string().nullable(),
  homeAddress: z.string().nullable(),
  homeLat: z.number().nullable(),
  homeLng: z.number().nullable(),
  campusAddress: z.string().nullable(),
  campusLat: z.number().nullable(),
  campusLng: z.number().nullable(),
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

export const SubmitAcademicVerificationSchema = z.object({
  role: AcademicRoleSchema,
})

export const MeResponseSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: z.enum(['PASSENGER', 'DRIVER', 'ADMIN']),
  avatarPath: z.string().nullable(),
  driverStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED']).nullable(),
  createdAt: z.string().datetime(),
  ...ProfileFieldsSchema.shape,
  ...ModerationStateSchema.shape,
  ...AcademicVerificationStateSchema.shape,
})

export const BlockedAuthErrorSchema = z.object({
  error: z.union([
    z.object({
      code: z.literal('ACCOUNT_SUSPENDED'),
      message: z.string(),
      details: z
        .object({
          suspendedUntil: z.string().datetime(),
        })
        .optional(),
    }),
    z.object({
      code: z.literal('ACCOUNT_BANNED'),
      message: z.string(),
    }),
  ]),
})

export type RegisterInput = z.infer<typeof RegisterSchema>
export type LoginInput = z.infer<typeof LoginSchema>
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>
export type ProfileFields = z.infer<typeof ProfileFieldsSchema>
export type DriverApplicationInput = z.infer<typeof DriverApplicationSchema>
export type SubmitAcademicVerificationInput = z.infer<typeof SubmitAcademicVerificationSchema>
export type AccountStatus = z.infer<typeof AccountStatusSchema>
export type AcademicRole = z.infer<typeof AcademicRoleSchema>
export type AcademicVerificationStatus = z.infer<typeof AcademicVerificationStatusSchema>
export type ModerationState = z.infer<typeof ModerationStateSchema>
export type AcademicVerificationState = z.infer<typeof AcademicVerificationStateSchema>
export type MeResponse = z.infer<typeof MeResponseSchema>
export type BlockedAuthError = z.infer<typeof BlockedAuthErrorSchema>
