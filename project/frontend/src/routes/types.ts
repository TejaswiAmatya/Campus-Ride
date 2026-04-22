import type { ReactNode } from 'react'

export type AppRoute = {
  path: string
  element: ReactNode
  requiresAuth?: boolean
  requiredRole?: 'PASSENGER' | 'DRIVER' | 'ADMIN'
}
