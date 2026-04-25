export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'

export interface BookingLocation {
  address: string
  lat: number
  lng: number
}

export interface BookingListItem {
  id: string
  status: BookingStatus
  seatsBooked: number
  totalFare: string
  pickup: BookingLocation | null
  dropoff: BookingLocation | null
  messageToDriver: string | null
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
  paymentStatus: string
  createdAt: string
  updatedAt: string
  pickup: BookingLocation | null
  dropoff: BookingLocation | null
  messageToDriver: string | null
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
