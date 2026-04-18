import { z } from 'zod'

export const CreateRideSchema = z.object({
  originAddress: z.string().min(1, 'Origin address is required'),
  originLat: z.number().min(-90).max(90),
  originLng: z.number().min(-180).max(180),
  destinationAddress: z.string().min(1, 'Destination address is required'),
  destinationLat: z.number().min(-90).max(90),
  destinationLng: z.number().min(-180).max(180),
  departureTime: z.string().datetime({ message: 'Must be a valid ISO 8601 datetime' }),
  totalSeats: z.number().int().min(1).max(8),
  pricePerSeat: z.number().positive('Price must be greater than 0'),
})

export const SearchRidesSchema = z.object({
  origin: z.string().optional(),
  destination: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
  seats: z.coerce.number().int().min(1).optional(),
  // Bounding box for geo search (populated by the map component)
  originLat: z.coerce.number().optional(),
  originLng: z.coerce.number().optional(),
  radiusKm: z.coerce.number().positive().optional(),
})

export const UpdateRideStatusSchema = z.object({
  status: z.enum(['IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
})

export type CreateRideInput = z.infer<typeof CreateRideSchema>
export type SearchRidesInput = z.infer<typeof SearchRidesSchema>
export type UpdateRideStatusInput = z.infer<typeof UpdateRideStatusSchema>
