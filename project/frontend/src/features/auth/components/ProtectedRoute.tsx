import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/hooks/useAuth";

interface ProtectedRouteProps {
  /** If provided, the user must have exactly this role to access the route. */
  requiredRole?: "PASSENGER" | "DRIVER" | "ADMIN";
  /** If provided, the user is redirected away when they have this role. */
  blockedRole?: "PASSENGER" | "DRIVER" | "ADMIN";
}

export function getDefaultAuthenticatedPath(
  role?: "PASSENGER" | "DRIVER" | "ADMIN",
) {
  return role === "ADMIN" ? "/admin" : "/dashboard";
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
export function ProtectedRoute({
  requiredRole,
  blockedRole,
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground animate-pulse">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to={getDefaultAuthenticatedPath(user.role)} replace />;
  }

  if (
    requiredRole === "ADMIN" &&
    user.role === "ADMIN" &&
    user.mustChangePassword &&
    location.pathname !== "/admin/change-password"
  ) {
    return <Navigate to="/admin/change-password" replace />;
  }

  if (blockedRole && user.role === blockedRole) {
    return <Navigate to={getDefaultAuthenticatedPath(user.role)} replace />;
  }

  return <Outlet />;
}
