import { BookingsPage } from './BookingsPage'
import type { AppRoute } from '@/routes/types'

export const bookingRoutes: AppRoute[] = [
  { path: '/bookings', element: <BookingsPage />, requiresAuth: true },
]
