export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'

export interface BookingLocation {
  address: string
  lat: number
  lng: number
}

export interface BookingPaymentSnapshot {
  status: string
  paidAt: string | null
  refundedAt: string | null
}

export interface BookingRefundSnapshot {
  amount: string
  remainingCharged: string
}

export interface BookingListItem {
  id: string
  status: BookingStatus
  seatsBooked: number
  totalFare: string
  refundedAmount: string
  paymentStatus: string
  paidAt: string | null
  refundedAt: string | null
  pickup: BookingLocation | null
  dropoff: BookingLocation | null
  messageToDriver: string | null
  payment: BookingPaymentSnapshot
  refund: BookingRefundSnapshot
  createdAt: string
  passenger?: { id: string; name: string }
  ride: {
    id: string
    originAddress: string
    destinationAddress: string
    departureTime: string
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
  refundedAmount: string
  paymentStatus: string
  paidAt?: string | null
  refundedAt?: string | null
  createdAt: string
  updatedAt: string
  pickup: BookingLocation | null
  dropoff: BookingLocation | null
  messageToDriver: string | null
  payment?: BookingPaymentSnapshot
  refund?: BookingRefundSnapshot
  passenger: { id: string; name: string; avatarUrl: string | null }
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
