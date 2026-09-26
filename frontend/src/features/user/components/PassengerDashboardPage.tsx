import { CalendarDays, Clock3, Search, User } from 'lucide-react'
import { DashboardCard } from '@/features/user/components/DashboardCard'

export function PassengerDashboardPage() {
  return (
    <div className="-mx-4 -my-8 min-h-[calc(100vh-4rem)] bg-background lg:-mx-8 lg:-my-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-content flex-col px-4 py-6 lg:px-8 lg:py-8">
        <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
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
            tone="soft"
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
      </div>
    </div>
  )
}
