import { ProfilePage } from './ProfilePage'
import type { AppRoute } from '@/routes/types'

export const profileRoutes: AppRoute[] = [
  { path: '/profile', element: <ProfilePage />, requiresAuth: true },
]
