import { Link } from 'react-router-dom'
import { Car, MapPin, CalendarCheck, User, LayoutDashboard } from 'lucide-react'
import { useAuth, useLogout } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

export function Navbar() {
  const { user, isAuthenticated } = useAuth()
  const logout = useLogout()

  return (
    <nav className="sticky top-0 z-50 border-b bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2 font-bold text-primary">
          <Car className="h-5 w-5" />
          <span>Campus Ride</span>
        </Link>

        {/* Nav links */}
        {isAuthenticated ? (
          <div className="flex items-center gap-1">
            <NavLink to="/rides" icon={<MapPin className="h-4 w-4" />} label="Rides" />
            <NavLink to="/bookings" icon={<CalendarCheck className="h-4 w-4" />} label="Bookings" />
            {user?.role === 'ADMIN' && (
              <NavLink
                to="/admin"
                icon={<LayoutDashboard className="h-4 w-4" />}
                label="Admin"
              />
            )}
            <NavLink to="/profile" icon={<User className="h-4 w-4" />} label={user?.name ?? 'Profile'} />
            <button
              onClick={logout}
              className="ml-2 rounded-md px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="rounded-md px-3 py-1.5 text-sm hover:bg-secondary transition-colors"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Register
            </Link>
          </div>
        )}
      </div>
    </nav>
  )
}

function NavLink({
  to,
  icon,
  label,
}: {
  to: string
  icon: React.ReactNode
  label: string
}) {
  return (
    <Link
      to={to}
      className={cn(
        'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors',
        'hover:bg-secondary hover:text-secondary-foreground',
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </Link>
  )
}
