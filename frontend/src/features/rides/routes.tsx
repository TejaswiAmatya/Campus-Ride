import { Navigate } from 'react-router-dom'
import { PostRidePage } from './components/PostRidePage'
import { RidesPage } from './components/RidesPage'
import type { AppRoute } from '@/routes/types'

export const rideRoutes: AppRoute[] = [
  { path: '/', element: <Navigate to="/rides" replace />, requiresAuth: true },
  { path: '/rides', element: <RidesPage />, requiresAuth: true },
  { path: '/rides/post', element: <PostRidePage />, requiresAuth: true },
]
