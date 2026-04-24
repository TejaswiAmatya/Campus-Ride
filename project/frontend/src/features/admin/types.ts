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

export interface AdminReport {
  id: string
  reporter: {
    id: string
    name: string
    email: string
  }
  targetUserId: string | null
  targetRideId: string | null
  targetUserRole: 'PASSENGER' | 'DRIVER' | 'ADMIN' | null
  reason: string
  status: 'OPEN' | 'RESOLVED' | 'DISMISSED'
  note: string | null
  createdAt: string
  updatedAt: string
}
