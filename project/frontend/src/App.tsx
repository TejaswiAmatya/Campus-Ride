import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Navbar } from './components/Navbar'
import { ProtectedRoute } from './components/ProtectedRoute'
import { authRoutes } from './features/auth/routes'
import { rideRoutes } from './features/rides/routes'
import { bookingRoutes } from './features/bookings/routes'
import { profileRoutes } from './features/profile/routes'
import { adminRoutes } from './features/admin/routes'
import type { AppRoute } from './routes/types'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,      // 1 minute
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export function App() {
  const protectedRoutes: AppRoute[] = [...rideRoutes, ...bookingRoutes, ...profileRoutes].filter(
    (route) => route.requiresAuth && !route.requiredRole,
  )
  const protectedAdminRoutes: AppRoute[] = adminRoutes.filter(
    (route) => route.requiresAuth && route.requiredRole === 'ADMIN',
  )

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen bg-background">
          <Navbar />
          <main className="container mx-auto px-4 py-6">
            <Routes>
              {authRoutes.map((route) => (
                <Route key={route.path} path={route.path} element={route.element} />
              ))}

              <Route element={<ProtectedRoute />}>
                {protectedRoutes.map((route) => (
                  <Route key={route.path} path={route.path} element={route.element} />
                ))}
              </Route>

              <Route element={<ProtectedRoute requiredRole="ADMIN" />}>
                {protectedAdminRoutes.map((route) => (
                  <Route key={route.path} path={route.path} element={route.element} />
                ))}
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
