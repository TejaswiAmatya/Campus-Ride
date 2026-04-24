import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Navbar } from './components/Navbar'
import { ProtectedRoute } from './components/ProtectedRoute'
import { LoginPage } from './features/auth/LoginPage'
import { RegisterPage } from './features/auth/RegisterPage'
import { DriverRegistrationPage } from './features/auth/DriverRegistrationPage'
import { SearchRidesPage } from './features/rides/SearchRidesPage'
import { PostRidePage } from './features/rides/PostRidePage'
import { RideDetailPage } from './features/rides/RideDetailPage'
import { MyRidesPage } from './features/rides/MyRidesPage'
import { BookingsPage } from './features/bookings/BookingsPage'
import { BookingCheckoutPage } from './features/bookings/BookingCheckoutPage'
import { BookingStatusPage } from './features/bookings/BookingStatusPage'
import { ProfilePage } from './features/user/ProfilePage'
import { AdminDashboard } from './features/admin/AdminDashboard'
import { DriverApprovalPage } from './features/admin/DriverApprovalPage'

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
                <Route path="/" element={<Navigate to="/rides" replace />} />
                <Route path="/driver/register" element={<DriverRegistrationPage />} />
              
                <Route path="/rides" element={<SearchRidesPage />} />
                <Route path="/rides/mine" element={<MyRidesPage />} />
                <Route path="/rides/post" element={<PostRidePage />} />
                <Route path="/rides/:rideId/checkout" element={<BookingCheckoutPage />} />
                <Route path="/rides/:id" element={<RideDetailPage />} />
                <Route path="/bookings/:id" element={<BookingStatusPage />} />
                <Route path="/bookings" element={<BookingsPage />} />
                <Route path="/profile" element={<ProfilePage />} />
              </Route>

              {/* Admin only */}
              <Route element={<ProtectedRoute requiredRole="ADMIN" />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/drivers" element={<DriverApprovalPage />} />
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
