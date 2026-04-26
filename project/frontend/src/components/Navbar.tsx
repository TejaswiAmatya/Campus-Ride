import { Link, NavLink } from "react-router-dom";
import {
  Car,
  MapPin,
  CalendarCheck,
  User,
  LayoutDashboard,
  CheckCircle,
  FileWarning,
  PlusCircle,
  Wallet,
  Bell,
  Settings,
} from "lucide-react";
import { useAuth, useLogout } from "@/hooks/useAuth";
import {
  canAccessDriverRoutes,
  isDriverPending,
} from "@/features/auth/routing";
import { cn } from "@/lib/utils";

export function Navbar() {
  const { user, isAuthenticated } = useAuth();
  const logout = useLogout();
  const isAdmin = user?.role === "ADMIN";
  const isApprovedDriver = !!user && canAccessDriverRoutes(user);
  const pendingDriver = !!user && isDriverPending(user);

  const passengerNav = [
    {
      to: "/dashboard",
      icon: <LayoutDashboard className="h-4 w-4" />,
      label: "Dashboard",
    },
    { to: "/rides", icon: <MapPin className="h-4 w-4" />, label: "Rides" },
    {
      to: "/bookings",
      icon: <CalendarCheck className="h-4 w-4" />,
      label: "Bookings",
    },
    { to: "/profile", icon: <User className="h-4 w-4" />, label: "Profile" },
  ];

  const driverNav = [
    {
      to: "/driver/dashboard",
      icon: <LayoutDashboard className="h-4 w-4" />,
      label: "Driver Dashboard",
    },
    {
      to: "/driver/rides",
      icon: <Car className="h-4 w-4" />,
      label: "My Rides",
    },
    {
      to: "/driver/rides/new",
      icon: <PlusCircle className="h-4 w-4" />,
      label: "Post Ride",
    },
    {
      to: "/driver/earnings",
      icon: <Wallet className="h-4 w-4" />,
      label: "Earnings",
    },
    { to: "/profile", icon: <User className="h-4 w-4" />, label: "Profile" },
  ];

  const adminNav = [
    {
      to: "/admin",
      icon: <LayoutDashboard className="h-4 w-4" />,
      label: "Admin",
    },
    { to: "/profile", icon: <User className="h-4 w-4" />, label: "Profile" },
  ];

  const navItems = !user
    ? []
    : isApprovedDriver
      ? driverNav
      : user.role === "ADMIN"
        ? adminNav
        : passengerNav;

  return (
    <nav className="sticky top-0 z-50 border-b bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        {/* Brand */}
        <Link
          to="/dashboard"
          className="flex items-center gap-2 font-bold text-primary"
        >
          <Car className="h-5 w-5" />
          <span>Campus Ride</span>
        </Link>

        {/* Nav links */}
        {isAuthenticated ? (
          <div className="flex items-center gap-2">
            {isAdmin ? (
              <div className="hidden items-center gap-1 lg:flex">
                <RouteNavLink
                  to="/admin"
                  icon={<LayoutDashboard className="h-4 w-4" />}
                  label="Admin"
                />
                <RouteNavLink
                  to="/admin/approvals"
                  icon={<CheckCircle className="h-4 w-4" />}
                  label="Approvals"
                />
                <RouteNavLink
                  to="/admin/reports"
                  icon={<FileWarning className="h-4 w-4" />}
                  label="Reports"
                />
                <RouteNavLink
                  to="/admin/settings"
                  icon={<Settings className="h-4 w-4" />}
                  label="Settings"
                />
              </div>
            ) : (
              <>
                <div className="hidden items-center gap-1 lg:flex">
                  {navItems.map((item) => (
                    <RouteNavLink
                      key={item.to}
                      to={item.to}
                      icon={item.icon}
                      label={item.label}
                    />
                  ))}
                </div>

                {pendingDriver ? (
                  <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                    Driver Pending
                  </span>
                ) : null}

                <Link
                  to="/profile"
                  className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground"
                  aria-label="Profile"
                >
                  <User className="h-4 w-4" />
                </Link>

                <button
                  type="button"
                  className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground"
                  aria-label="Notifications"
                >
                  <Bell className="h-4 w-4" />
                </button>
              </>
            )}

            <button
              onClick={logout}
              className="rounded-md px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              to="/auth/login"
              className="rounded-md px-3 py-1.5 text-sm hover:bg-secondary transition-colors"
            >
              Sign in
            </Link>
            <Link
              to="/auth/register"
              className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Register
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}

function RouteNavLink({
  to,
  icon,
  label,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
          isActive
            ? "bg-primary/10 text-primary"
            : "hover:bg-secondary hover:text-secondary-foreground",
        )
      }
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </NavLink>
  );
}
