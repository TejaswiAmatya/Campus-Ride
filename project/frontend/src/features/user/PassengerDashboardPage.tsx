import { useQuery } from '@tanstack/react-query'
import { CalendarDays, Clock3, Search, User } from 'lucide-react'
import { fetchMe } from '@/api/client'
import { DashboardCard } from '@/components/DashboardCard'
import { ProfileSummaryCard } from '@/components/ProfileSummaryCard'

export function PassengerDashboardPage() {
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: fetchMe })

  return (
    <section className="mx-auto max-w-[var(--content-wide)] px-[var(--space-6)] py-[var(--space-8)]">
      <h1 className="mb-[var(--space-8)] text-[var(--text-xl)] font-bold text-[var(--color-text)]">
        Welcome back, {user?.name ?? 'there'}
      </h1>

      <div className="mb-[var(--space-6)]">
        <ProfileSummaryCard
          name={user?.name ?? 'Guest User'}
          email={user?.email ?? 'guest@example.com'}
          avatarUrl={user?.avatarPath ?? null}
          role={user?.role ?? 'PASSENGER'}
        />
      </div>

      <div className="grid grid-cols-1 gap-[var(--space-6)] md:[grid-template-columns:repeat(auto-fill,minmax(min(300px,100%),1fr))]">
        <DashboardCard
          title="Find a Ride"
          subtitle="Search available rides near you"
          icon={<Search />}
          href="/rides"
          accent="primary"
        />

        {/* TODO: wire usePassengerDashboardData() hook in step 9 */}
        <DashboardCard
          title="Upcoming Bookings"
          subtitle="You have no upcoming bookings yet"
          icon={<CalendarDays />}
          accent="primary"
        />

        {/* TODO: wire usePassengerDashboardData() hook in step 9 */}
        <DashboardCard
          title="Recent History"
          subtitle="Your completed rides will appear here"
          icon={<Clock3 />}
        />

        <DashboardCard
          title="Your Profile"
          subtitle="Manage your account settings"
          icon={<User />}
          href="/profile"
        />
      </div>
    </section>
  )
}
