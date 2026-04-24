import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Navbar } from './components/Navbar'
import { ProtectedRoute, getDefaultAuthenticatedPath } from './components/ProtectedRoute'
import { LoginPage } from './features/auth/LoginPage'
import { RegisterPage } from './features/auth/RegisterPage'
import { DriverRegistrationPage } from './features/auth/DriverRegistrationPage'
import { SearchRidesPage } from './features/rides/SearchRidesPage'
import { PostRidePage } from './features/rides/PostRidePage'
import { RideDetailPage } from './features/rides/RideDetailPage'
import { BookingsPage } from './features/bookings/BookingsPage'
import { ProfilePage } from './features/profile/ProfilePage'
import { AdminDashboard } from './features/admin/AdminDashboard'
import { DriverApprovalsPage } from './features/admin/DriverApprovalsPage'
import { useAuth } from './hooks/useAuth'

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
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen bg-background">
          <Navbar />
          <main className="container mx-auto px-4 py-6">
            <Routes>
              {/* Public */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Authenticated (any role) */}
              <Route element={<ProtectedRoute />}>
                <Route path="/" element={<HomeRedirect />} />
                <Route path="/profile" element={<ProfilePage />} />
              </Route>

              {/* Authenticated (non-admin) */}
              <Route element={<ProtectedRoute blockedRole="ADMIN" />}>
                <Route path="/driver/register" element={<DriverRegistrationPage />} />
                <Route path="/rides" element={<SearchRidesPage />} />
                <Route path="/rides/post" element={<PostRidePage />} />
                <Route path="/rides/:id" element={<RideDetailPage />} />
                <Route path="/bookings" element={<BookingsPage />} />
              </Route>

              {/* Admin only */}
              <Route element={<ProtectedRoute requiredRole="ADMIN" />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/approvals" element={<DriverApprovalsPage />} />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

function HomeRedirect() {
  const { user } = useAuth()

  return <Navigate to={getDefaultAuthenticatedPath(user?.role)} replace />
}
