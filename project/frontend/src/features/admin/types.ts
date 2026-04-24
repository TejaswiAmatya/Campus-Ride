export interface PendingDriverVehicle {
  make: string
  model: string
  year: number
  plateNumber: string
}

export interface PendingDriver {
  id: string
  name: string
  email: string
  licenceUrl?: string | null
  vehicle?: PendingDriverVehicle | null
  createdAt: string
}
