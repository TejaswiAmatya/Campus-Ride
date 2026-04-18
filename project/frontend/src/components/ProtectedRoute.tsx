import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

interface ProtectedRouteProps {
  /** If provided, the user must have exactly this role to access the route. */
  requiredRole?: 'PASSENGER' | 'DRIVER' | 'ADMIN'
}

/**
 * Wraps a group of routes to require authentication (and optionally a specific role).
 *
 * Usage in App.tsx:
 *   <Route element={<ProtectedRoute />}>
 *     <Route path="/bookings" element={<BookingsPage />} />
 *   </Route>
 *
 *   <Route element={<ProtectedRoute requiredRole="ADMIN" />}>
 *     <Route path="/admin" element={<AdminDashboard />} />
 *   </Route>
 */
export function ProtectedRoute({ requiredRole }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground animate-pulse">Loading…</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
