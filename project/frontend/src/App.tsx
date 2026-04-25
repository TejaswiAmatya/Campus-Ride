import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Navbar } from "./components/Navbar";
import { PublicProfilePage } from "./components/PublicProfilePage";
import {
  ProtectedRoute,
  getDefaultAuthenticatedPath,
} from "./components/ProtectedRoute";
import { LoginPage } from "./features/auth/LoginPage";
import { RegisterPage } from "./features/auth/RegisterPage";
import { DriverRegistrationPage } from "./features/auth/DriverRegistrationPage";
import { SearchRidesPage } from "./features/rides/SearchRidesPage";
import { PostRidePage } from "./features/rides/PostRidePage";
import { RideDetailPage } from "./features/rides/RideDetailPage";
import { MyRidesPage } from "./features/rides/MyRidesPage";
import { BookingsPage } from "./features/bookings/BookingsPage";
import { BookingCheckoutPage } from "./features/bookings/BookingCheckoutPage";
import { BookingStatusPage } from "./features/bookings/BookingStatusPage";
import { AdminDashboard } from "./features/admin/AdminDashboard";
import { DriverApprovalsPage } from "./features/admin/DriverApprovalsPage";
import { ReportsPage } from "./features/admin/ReportsPage";
import { useAuth } from "./hooks/useAuth";
import { DriverApprovalPage } from "./features/admin/DriverApprovalPage";
import { canAccessDriverRoutes } from "./features/auth/routing";
import { DashboardRoutingPage } from "./features/user/DashboardRoutingPage";
import { ProfilePage } from "./features/user/ProfilePage";
import { DriverDashboardPage } from "./features/user/DriverDashboardPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000, // 1 minute
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const DashboardEntryPage = DashboardRoutingPage;
const BookingHistoryPage = BookingsPage;
const BookingDetailPage = BookingStatusPage;
const ManageRidePage = RideDetailPage;
const EarningsPage = DriverDashboardPage;
const AdminDashboardPage = AdminDashboard;
const AdminDriversPage = DriverApprovalPage;
const AdminUsersPage = AdminDashboard;
const AdminRidesPage = AdminDashboard;

function RequireDriverApproved() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground animate-pulse">Loading…</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth/login" replace />;
  if (!canAccessDriverRoutes(user)) return <Navigate to="/dashboard" replace />;
  return <ProtectedRoute />;
}

function RequireAdmin() {
  return <ProtectedRoute requiredRole="ADMIN" />;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen bg-background">
          <Navbar />
          <main className="container mx-auto px-4 py-6">
            <Routes>
              {/* Public */}
              <Route path="/auth/login" element={<LoginPage />} />
              <Route path="/auth/register" element={<RegisterPage />} />
              <Route path="/profile/:id" element={<PublicProfilePage />} />

              {/* Authenticated */}
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<DashboardEntryPage />} />
                <Route path="/rides" element={<SearchRidesPage />} />
                <Route path="/rides/:id" element={<RideDetailPage />} />
                <Route
                  path="/rides/:rideId/book"
                  element={<BookingCheckoutPage />}
                />
                <Route path="/bookings" element={<BookingHistoryPage />} />
                <Route path="/bookings/:id" element={<BookingDetailPage />} />
                <Route
                  path="/driver/register"
                  element={<DriverRegistrationPage />}
                />
                <Route path="/profile" element={<ProfilePage />} />
              </Route>

              {/* Driver only */}
              <Route element={<RequireDriverApproved />}>
                <Route
                  path="/driver/dashboard"
                  element={<Navigate to="/dashboard" replace />}
                />
                <Route path="/driver/rides" element={<MyRidesPage />} />
                <Route path="/driver/rides/new" element={<PostRidePage />} />
                <Route path="/driver/rides/:id" element={<ManageRidePage />} />
                <Route path="/driver/earnings" element={<EarningsPage />} />
              </Route>

              {/* Admin only */}
              <Route element={<ProtectedRoute requiredRole="ADMIN" />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route
                  path="/admin/approvals"
                  element={<DriverApprovalsPage />}
                />
                <Route path="/admin/reports" element={<ReportsPage />} />
              </Route>

              {/* Legacy redirects */}
              <Route
                path="/login"
                element={<Navigate to="/auth/login" replace />}
              />
              <Route
                path="/register"
                element={<Navigate to="/auth/register" replace />}
              />
              <Route
                path="/rides/post"
                element={<Navigate to="/driver/rides/new" replace />}
              />
              <Route
                path="/rides/mine"
                element={<Navigate to="/driver/rides" replace />}
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

function HomeRedirect() {
  const { user } = useAuth();

  return <Navigate to={getDefaultAuthenticatedPath(user?.role)} replace />;
}
