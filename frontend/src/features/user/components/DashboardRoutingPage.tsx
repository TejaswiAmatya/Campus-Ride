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
import { canAccessDriverRoutes, isDriverPending } from '@/features/auth/lib/routing'
import { DashboardCard } from '@/features/user/components/DashboardCard'
import { PendingDriverBanner } from '@/features/user/components/PendingDriverBanner'

export function DashboardRoutingPage() {
  const { data: user, isLoading, isError } = useQuery({ queryKey: ['me'], queryFn: fetchMe })

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="animate-pulse text-sm text-mute">Loading…</p>
      </div>
    )
  }

  if (isError || !user) {
    return <Navigate to="/auth/login" replace />
  }

  const isDriver = canAccessDriverRoutes(user)
  const pending = isDriverPending(user)
  const firstName = user.name?.split(' ')[0] ?? 'there'

  return (
    <div className="-mx-4 -my-8 bg-background lg:-mx-8">
      {pending ? <PendingDriverBanner /> : null}

      <div
        className={
          isDriver
            ? 'mx-auto flex max-w-content flex-col gap-4 px-4 py-4 lg:px-8'
            : 'mx-auto flex h-[calc(100vh-4rem)] max-w-content flex-col px-4 py-4 lg:px-8'
        }
      >
        <header className="flex min-h-0 shrink-0 basis-[15%] items-center">
          <h1 className="font-display text-display-md text-foreground sm:text-display-lg">
            Welcome back, {firstName}
          </h1>
        </header>

        <div
          className={
            isDriver
              ? 'grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4'
              : 'mb-[5%] grid min-h-0 basis-[80%] grid-cols-1 grid-rows-4 gap-3 sm:grid-cols-2 sm:grid-rows-2 sm:gap-4'
          }
        >
          <DashboardCard
            size="hero"
            tone="dark"
            title="Find a ride"
            subtitle="Search available rides near you"
            icon={<Search />}
            href="/rides"
          />
          <DashboardCard
            size="hero"
            tone="dense"
            title="Upcoming bookings"
            subtitle="Your confirmed trips"
            icon={<CalendarDays />}
            href="/bookings"
          />
          <DashboardCard
            size="hero"
            tone="soft"
            title="Ride history"
            subtitle="Your completed rides"
            icon={<Clock3 />}
            href="/bookings/history"
          />
          <DashboardCard
            size="hero"
            tone="light"
            title="Your profile"
            subtitle="Manage account settings"
            icon={<User />}
            href="/profile"
          />
        </div>

        {isDriver ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            <DashboardCard
              size="hero"
              tone="dark"
              title="Post a ride"
              subtitle="Create a new ride for passengers"
              icon={<CirclePlus />}
              href="/driver/rides/new"
            />
            <DashboardCard
              size="hero"
              tone="soft"
              title="My rides"
              subtitle="Manage your scheduled rides"
              icon={<Car />}
              href="/driver/rides"
            />
            <DashboardCard
              size="hero"
              tone="soft"
              title="Ride history"
              subtitle="See your completed rides"
              icon={<History />}
              href="/driver/rides/history"
            />
            <DashboardCard
              size="hero"
              tone="light"
              title="Earnings"
              subtitle="View your earnings summary"
              icon={<TrendingUp />}
              href="/driver/earnings"
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}
