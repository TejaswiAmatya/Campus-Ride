import { z } from 'zod'

const BookingLocationSchema = z.object({
  address: z.string().min(1, 'Address is required'),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
})

export const CreateBookingSchema = z.object({
  rideId: z.string().uuid('rideId must be a valid UUID'),
  seatsBooked: z.number().int().min(1, 'Must book at least one seat').max(8),
  pickup: BookingLocationSchema.optional(),
  dropoff: BookingLocationSchema.optional(),
  messageToDriver: z.string().trim().max(1000).optional(),
})

export const UpdateBookingStatusSchema = z.object({
  status: z.enum(['CONFIRMED', 'DECLINED', 'CANCELLED']),
  reason: z.string().max(500).optional(), // optional cancellation/decline note
})

export const ListBookingsSchema = z.object({
  asDriver: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((value) => value === 'true'),
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED']).optional(),
  upcoming: z
    .union([z.literal('true'), z.literal('false')])
    .optional()
    .transform((value) => value === 'true'),
})

export const CancelBookingSchema = z.object({
  reason: z.string().trim().max(500).optional(),
})

export const UpdateBookingCheckpointSchema = z.object({
  note: z.string().trim().max(500).optional(),
})

export const CreateReviewSchema = z.object({
  bookingId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
})

export type CreateBookingInput = z.infer<typeof CreateBookingSchema>
export type UpdateBookingStatusInput = z.infer<typeof UpdateBookingStatusSchema>
export type ListBookingsInput = z.infer<typeof ListBookingsSchema>
export type CancelBookingInput = z.infer<typeof CancelBookingSchema>
export type UpdateBookingCheckpointInput = z.infer<typeof UpdateBookingCheckpointSchema>
export type CreateReviewInput = z.infer<typeof CreateReviewSchema>
