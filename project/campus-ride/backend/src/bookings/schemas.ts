import { z } from 'zod'

export const CreateBookingSchema = z.object({
  rideId: z.string().uuid('rideId must be a valid UUID'),
  seatsBooked: z.number().int().min(1, 'Must book at least one seat').max(8),
})

export const UpdateBookingStatusSchema = z.object({
  status: z.enum(['CONFIRMED', 'DECLINED', 'CANCELLED']),
  reason: z.string().max(500).optional(), // optional cancellation/decline note
})

export const CreateReviewSchema = z.object({
  bookingId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
})

export type CreateBookingInput = z.infer<typeof CreateBookingSchema>
export type UpdateBookingStatusInput = z.infer<typeof UpdateBookingStatusSchema>
export type CreateReviewInput = z.infer<typeof CreateReviewSchema>
