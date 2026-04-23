import { z } from 'zod'

const RideLocationSchema = z.object({
  address: z.string().min(1, 'Address is required'),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
})

export const CreateRideSchema = z.object({
  origin: RideLocationSchema,
  destination: RideLocationSchema,
  departureTime: z.string().datetime({ message: 'Must be a valid ISO 8601 datetime' }),
  totalSeats: z.number().int().min(1).max(8),
  pricePerSeat: z.number().positive('Price must be greater than 0'),
})

export const SearchRidesSchema = z.object({
  origin: z.string().trim().min(1).optional(),
  dest: z.string().trim().min(1).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
  seats: z.coerce.number().int().min(1).max(8).optional(),
  originLat: z.coerce.number().min(-90).max(90).optional(),
  originLng: z.coerce.number().min(-180).max(180).optional(),
  destLat: z.coerce.number().min(-90).max(90).optional(),
  destLng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().positive().max(100).optional(),
}).superRefine((value, ctx) => {
  const hasOriginLat = value.originLat !== undefined
  const hasOriginLng = value.originLng !== undefined
  const hasDestLat = value.destLat !== undefined
  const hasDestLng = value.destLng !== undefined

  if (hasOriginLat !== hasOriginLng) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'originLat and originLng must be provided together',
      path: hasOriginLat ? ['originLng'] : ['originLat'],
    })
  }

  if (hasDestLat !== hasDestLng) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'destLat and destLng must be provided together',
      path: hasDestLat ? ['destLng'] : ['destLat'],
    })
  }
})

export const UpdateRideStatusSchema = z.object({
  status: z.enum(['IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
})

export type CreateRideInput = z.infer<typeof CreateRideSchema>
export type SearchRidesInput = z.infer<typeof SearchRidesSchema>
export type UpdateRideStatusInput = z.infer<typeof UpdateRideStatusSchema>
