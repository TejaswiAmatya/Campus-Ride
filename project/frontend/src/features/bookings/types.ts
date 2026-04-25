export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'

export interface BookingListItem {
  id: string
  status: BookingStatus
  seatsBooked: number
  totalFare: string
  driverEarnings: string
  createdAt: string
  updatedAt: string
  passenger?: { id: string; name: string }
  review: {
    id: string
    rating: number
    comment: string | null
    createdAt: string
  } | null
  ride: {
    id: string
    originAddress: string
    destinationAddress: string
    departureTime: string
    status: string
    driver: { id: string; name: string }
  }
}

export interface BookingDetail {
  id: string
  status: BookingStatus
  seatsBooked: number
  totalFare: string
  platformFee: string
  driverEarnings: string
  paymentStatus: string
  createdAt: string
  updatedAt: string
  passenger: { id: string; name: string; avatarUrl: string | null }
  review: {
    id: string
    rating: number
    comment: string | null
    createdAt: string
    reviewerId: string
    revieweeId: string
  } | null
  ride: {
    id: string
    originAddress: string
    originLat: number
    originLng: number
    destinationAddress: string
    destinationLat: number
    destinationLng: number
    departureTime: string
    availableSeats: number
    totalSeats: number
    pricePerSeat: string
    status: string
    driver: { id: string; name: string; avatarUrl: string | null }
  }
}
