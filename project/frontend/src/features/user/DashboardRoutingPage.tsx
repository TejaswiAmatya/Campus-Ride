import { useQuery } from '@tanstack/react-query'
import {
  CalendarDays,
  Car,
  CirclePlus,
  Clock3,
  History,
  Search,
  TrendingUp,
  User,
} from 'lucide-react'
import { Navigate } from 'react-router-dom'
import { fetchMe } from '@/api/client'
import { DashboardCard } from '@/components/DashboardCard'
import { ProfileSummaryCard } from '@/components/ProfileSummaryCard'
import { PendingDriverBanner } from '@/components/PendingDriverBanner'
import { canAccessDriverRoutes, isDriverPending } from '@/features/auth/routing'

export function DashboardRoutingPage() {
  const { data: user, isLoading, isError } = useQuery({ queryKey: ['me'], queryFn: fetchMe })

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-slate-400 animate-pulse">Loading dashboard…</p>
      </div>
    )
  }

  if (isError || !user) {
    return <Navigate to="/auth/login" replace />
  }

  const isDriver = canAccessDriverRoutes(user)
  const firstName = user.name?.split(' ')[0] ?? 'there'

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
      {isDriverPending(user) && <PendingDriverBanner />}

      {/* Welcome header */}
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-slate-400">
          Dashboard
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-800">
          Welcome back, {firstName}
        </h1>
      </div>

      {/* Profile card */}
      <ProfileSummaryCard
        name={user.name}
        email={user.email}
        avatarUrl={user.avatarPath ?? null}
        role={user.role}
      />

      {/* Passenger section */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <div className="h-px flex-1 bg-slate-100" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Passenger
          </span>
          <div className="h-px flex-1 bg-slate-100" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DashboardCard
            title="Find a Ride"
            subtitle="Search available rides near you"
            icon={<Search />}
            href="/rides"
            accent="blue"
          />
          <DashboardCard
            title="Upcoming Bookings"
            subtitle="Your confirmed trips"
            icon={<CalendarDays />}
            href="/bookings"
            accent="blue"
          />
          <DashboardCard
            title="Ride History"
            subtitle="Your completed rides"
            icon={<Clock3 />}
            href="/bookings"
            accent="violet"
          />
          <DashboardCard
            title="Your Profile"
            subtitle="Manage account settings"
            icon={<User />}
            href="/profile"
            accent="violet"
          />
        </div>
      </section>

      {/* Driver section */}
      {isDriver && (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <div className="h-px flex-1 bg-slate-100" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Driver
            </span>
            <div className="h-px flex-1 bg-slate-100" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <DashboardCard
              title="Post a Ride"
              subtitle="Create a new ride for passengers"
              icon={<CirclePlus />}
              href="/driver/rides/new"
              accent="emerald"
            />
            <DashboardCard
              title="My Rides"
              subtitle="Manage your scheduled rides"
              icon={<Car />}
              href="/driver/rides"
              accent="emerald"
            />
            <DashboardCard
              title="Ride History"
              subtitle="See your completed rides"
              icon={<History />}
              href="/driver/rides/history"
              accent="violet"
            />
            <DashboardCard
              title="Earnings"
              subtitle="View your earnings summary"
              icon={<TrendingUp />}
              href="/driver/earnings"
              accent="success"
            />
          </div>
        </section>
      )}
    </div>
  )
}
