import { useEffect, useId, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Car, User, Bell, LogOut } from "lucide-react";
import { useAuth, useLogout } from "@/features/auth/hooks/useAuth";
import {
  canAccessDriverRoutes,
  isDriverPending,
} from "@/features/auth/lib/routing";
import { cn } from "@/lib/utils";

export function Navbar() {
  const { user, isAuthenticated } = useAuth();
  const logout = useLogout();
  const isAdmin = user?.role === "ADMIN";
  const isApprovedDriver = !!user && canAccessDriverRoutes(user);
  const pendingDriver = !!user && isDriverPending(user);

  const passengerNav = [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/rides", label: "Rides" },
    { to: "/bookings", label: "Bookings" },
  ];

  const driverNav = [
    { to: "/driver/dashboard", label: "Driver Dashboard" },
    { to: "/driver/rides", label: "My Rides" },
    { to: "/driver/rides/new", label: "Post Ride" },
    { to: "/driver/earnings", label: "Earnings" },
  ];

  const adminNav = [
    { to: "/admin", label: "Admin" },
    { to: "/admin/approvals", label: "Approvals" },
    { to: "/admin/reports", label: "Reports" },
    { to: "/admin/health", label: "Health" },
    { to: "/admin/announcements", label: "Send Announcement" },
    { to: "/admin/settings", label: "Settings" },
  ];

  const navItems = !user
    ? []
    : isAdmin
      ? adminNav
      : isApprovedDriver
        ? driverNav
        : passengerNav;

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background">
      <div className="flex h-16 w-full items-center gap-4 pl-[5%] pr-3 sm:pr-4 lg:pr-5">
        <Link
          to="/dashboard"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill bg-primary text-primary-foreground transition-colors hover:bg-elevated"
          aria-label="Campus Ride home"
        >
          <Car className="h-4 w-4" />
        </Link>

        {isAuthenticated ? (
          <>
            <div className="hidden min-w-0 flex-1 items-center gap-1 lg:flex">
              {navItems.map((item) => (
                <RouteNavLink key={item.to} to={item.to} label={item.label} />
              ))}
            </div>

            <div className="ml-auto flex items-center gap-2">
              {pendingDriver ? (
                <span className="rounded-pill bg-warning px-3 py-1 text-xs font-medium text-warning-foreground">
                  Driver Pending
                </span>
              ) : null}

              <ProfileMenu onLogout={logout} />

              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-pill bg-soft text-foreground transition-colors hover:bg-border"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
              </button>
            </div>
          </>
        ) : (
          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/auth/login"
              className="rounded-pill px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-soft"
            >
              Sign in
            </Link>
            <Link
              to="/auth/register"
              className="rounded-pill bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-elevated"
            >
              Register
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}

function RouteNavLink({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "rounded-pill px-3 py-2 text-sm font-medium text-foreground transition-colors",
          isActive ? "bg-soft" : "hover:bg-soft",
        )
      }
    >
      {label}
    </NavLink>
  );
}

function ProfileMenu({ onLogout }: { onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="flex h-10 w-10 items-center justify-center rounded-pill bg-soft text-foreground transition-colors hover:bg-border"
        aria-label="Profile menu"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
      >
        <User className="h-4 w-4" />
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 min-w-[10rem] overflow-hidden rounded-xl bg-card py-1 shadow-elev-2"
        >
          <Link
            to="/profile"
            role="menuitem"
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-soft"
            onClick={() => setOpen(false)}
          >
            <User className="h-4 w-4" />
            Profile
          </Link>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      ) : null}
    </div>
  );
}
