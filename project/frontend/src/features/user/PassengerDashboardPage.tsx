import { useQuery } from '@tanstack/react-query'
import { CalendarDays, Clock3, Search, User } from 'lucide-react'
import { fetchMe } from '@/api/client'
import { DashboardCard } from '@/components/DashboardCard'
import { ProfileCompletionCard } from '@/components/ProfileCompletionCard'
import { ProfileSummaryCard } from '@/components/ProfileSummaryCard'

export function PassengerDashboardPage() {
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: fetchMe })
  const firstName = user?.name?.split(' ')[0] ?? 'there'

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-slate-400">Dashboard</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-800">Welcome back, {firstName}</h1>
      </div>

      <ProfileSummaryCard
        name={user?.name ?? 'Guest User'}
        email={user?.email ?? 'guest@example.com'}
        avatarUrl={user?.avatarPath ?? null}
        role={user?.role ?? 'PASSENGER'}
      />

      {user ? <ProfileCompletionCard user={user} /> : null}

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
          href="/bookings/history"
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
    </div>
  )
}
