export interface RideLocationInput {
  address: string
  lat: number
  lng: number
}

export interface CreateRideDto {
  origin: RideLocationInput
  destination: RideLocationInput
  departureTime: string
  totalSeats: number
  pricePerSeat: number
}

export interface RideDriver {
  id: string
  name: string
  avatarUrl?: string | null
  vehicle?: {
    make: string
    model: string
    year: number
    colour: string
    plateNumber: string
  } | null
}

export interface Ride {
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
  driver: RideDriver
}

export interface SearchRidesParams {
  location?: string
  date?: string
}
