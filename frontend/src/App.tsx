import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Navbar } from "./components/layout/Navbar";
import { AnnouncementToast } from "./features/announcements/components/AnnouncementToast";
import { PublicProfilePage } from "./features/user/components/PublicProfilePage";
import {
  ProtectedRoute,
  getDefaultAuthenticatedPath,
} from "./features/auth/components/ProtectedRoute";
import { ConfirmSignupPage } from "./features/auth/components/ConfirmSignupPage";
import { DriverRegistrationPage } from "./features/auth/components/DriverRegistrationPage";
import { LoginPage } from "./features/auth/components/LoginPage";
import { RegisterPage } from "./features/auth/components/RegisterPage";
import { useAuth } from "./features/auth/hooks/useAuth";
import { canAccessDriverRoutes } from "./features/auth/lib/routing";
import { AdminDashboard } from "./features/admin/components/AdminDashboard";
import { ChangePasswordPage } from "./features/admin/components/ChangePasswordPage";
import { DriverApprovalPage } from "./features/admin/components/DriverApprovalPage";
import { DriverApprovalsPage } from "./features/admin/components/DriverApprovalsPage";
import { PlatformHealthPage } from "./features/admin/components/PlatformHealthPage";
import { ReportsPage } from "./features/admin/components/ReportsPage";
import { SendAnnouncementPage } from "./features/admin/components/SendAnnouncementPage";
import { SettingsPage } from "./features/admin/components/SettingsPage";
import { useAnnouncements } from "./features/announcements/hooks/useAnnouncements";
import { BookingCheckoutPage } from "./features/bookings/components/BookingCheckoutPage";
import { BookingsPage } from "./features/bookings/components/BookingsPage";
import { BookingStatusPage } from "./features/bookings/components/BookingStatusPage";
import { PassengerRideHistoryPage } from "./features/bookings/components/PassengerRideHistoryPage";
import { useBookingRealtime } from "./features/bookings/hooks/useBookings";
import { MyRidesPage } from "./features/rides/components/MyRidesPage";
import { PostRidePage } from "./features/rides/components/PostRidePage";
import { RideDetailPage } from "./features/rides/components/RideDetailPage";
import { RideHistoryPage } from "./features/rides/components/RideHistoryPage";
import { SearchRidesPage } from "./features/rides/components/SearchRidesPage";
import { DashboardRoutingPage } from "./features/user/components/DashboardRoutingPage";
import { EarningsPage } from "./features/user/components/EarningsPage";
import { ProfilePage } from "./features/user/components/ProfilePage";
import { Toaster } from "./components/ui/toaster";

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

function RealtimeBootstrap() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return null;
  }

  return <RealtimeAuthenticatedBootstrap />;
}

function RealtimeAuthenticatedBootstrap() {
  useBookingRealtime(); // opens socket + emits join:user + subscribes to events
  return null; // renders nothing, just runs the hook
}

function AnnouncementBootstrap() {
  const { isAuthenticated } = useAuth();
  const { currentAnnouncement, dismissAnnouncement, queueLength } =
    useAnnouncements();

  if (!isAuthenticated) {
    return null;
  }

  return (
    <AnnouncementToast
      announcement={currentAnnouncement}
      onDismiss={dismissAnnouncement}
      queueLength={queueLength}
    />
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RealtimeBootstrap />
      <Toaster />
      <BrowserRouter>
        <div className="min-h-screen bg-background">
          <Navbar />
          <main className="container mx-auto px-4 py-6">
            <Routes>
              {/* Public */}
              <Route path="/auth/login" element={<LoginPage />} />
              <Route path="/auth/register" element={<RegisterPage />} />
              <Route path="/auth/confirm" element={<ConfirmSignupPage />} />
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
                <Route
                  path="/bookings/history"
                  element={<PassengerRideHistoryPage />}
                />
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
                <Route
                  path="/driver/rides/history"
                  element={<RideHistoryPage />}
                />
                <Route path="/driver/rides/new" element={<PostRidePage />} />
                <Route path="/driver/rides/:id" element={<ManageRidePage />} />
                <Route path="/driver/earnings" element={<EarningsPage />} />
              </Route>

              {/* Admin only */}
              <Route element={<ProtectedRoute requiredRole="ADMIN" />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route
                  path="/admin/change-password"
                  element={<ChangePasswordPage />}
                />
                <Route
                  path="/admin/approvals"
                  element={<DriverApprovalsPage />}
                />
                <Route path="/admin/reports" element={<ReportsPage />} />
                <Route path="/admin/health" element={<PlatformHealthPage />} />
                <Route path="/admin/settings" element={<SettingsPage />} />
                <Route
                  path="/admin/announcements"
                  element={<SendAnnouncementPage />}
                />
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
          <AnnouncementBootstrap />
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

function HomeRedirect() {
  const { user } = useAuth();

  return <Navigate to={getDefaultAuthenticatedPath(user?.role)} replace />;
}
