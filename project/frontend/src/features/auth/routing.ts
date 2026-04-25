export type AppRole = 'PASSENGER' | 'DRIVER' | 'ADMIN'
export type DriverStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | null

export interface RoutingUser {
  role: AppRole
  driverStatus?: DriverStatus
  isDriverApproved?: boolean
}

export function getDriverStatus(user: RoutingUser): DriverStatus {
  if (user.role !== 'DRIVER') return null
  if (typeof user.isDriverApproved === 'boolean') return user.isDriverApproved ? 'APPROVED' : 'PENDING'
  return user.driverStatus ?? null
}

export function isDriverPending(user: RoutingUser): boolean {
  return user.role === 'DRIVER' && getDriverStatus(user) !== 'APPROVED'
}

export function getDefaultRoute(user: RoutingUser): string {
  if (user.role === 'DRIVER' && isDriverPending(user)) return '/dashboard'
  if (user.role === 'ADMIN') return '/admin'
  if (user.role === 'DRIVER') return '/driver/dashboard'
  return '/rides'
}

export function canAccessDriverRoutes(user: RoutingUser): boolean {
  return user.role === 'DRIVER' && getDriverStatus(user) === 'APPROVED'
}

export function canAccessAdminRoutes(user: RoutingUser): boolean {
  return user.role === 'ADMIN'
}

export function isAuthenticated(user: RoutingUser | null): boolean {
  return user !== null
}
