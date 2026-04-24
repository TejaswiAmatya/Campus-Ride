import { useQuery } from '@tanstack/react-query'
import { Bell, Car, CirclePlus, TrendingUp } from 'lucide-react'
import { fetchMe } from '@/api/client'
import { DashboardCard } from '@/components/DashboardCard'
import { ProfileSummaryCard } from '@/components/ProfileSummaryCard'
import type { AppRole } from '@/features/auth/routing'

export function DriverDashboardPage() {
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: fetchMe })
  const role: AppRole = user?.role ?? 'DRIVER'

  return (
    <section className="mx-auto max-w-[var(--content-wide)] px-[var(--space-6)] py-[var(--space-8)]">
      <h1 className="mb-[var(--space-8)] text-[var(--text-xl)] font-bold text-[var(--color-text)]">
        Driver Dashboard
      </h1>

      <div className="mb-[var(--space-6)]">
        <ProfileSummaryCard
          name={user?.name ?? 'Driver'}
          email={user?.email ?? 'driver@example.com'}
          avatarUrl={user?.avatarPath ?? null}
          role={role}
        />
      </div>

      <div className="grid grid-cols-1 gap-[var(--space-6)] md:[grid-template-columns:repeat(auto-fill,minmax(min(300px,100%),1fr))]">
        <DashboardCard
          title="Post a Ride"
          subtitle="Create a new ride for passengers"
          icon={<CirclePlus />}
          href="/driver/rides/new"
          accent="primary"
        />

        <DashboardCard
          title="My Rides"
          subtitle="You have no upcoming rides scheduled"
          icon={<Car />}
          href="/driver/rides"
          accent="primary"
        />

        {/* TODO: wire useDriverDashboardData() hook in step 9 */}
        <DashboardCard
          title="Pending Requests"
          subtitle="No booking requests awaiting action"
          icon={<Bell />}
          accent="warning"
        />

        <DashboardCard
          title="Earnings"
          subtitle="Your earnings summary"
          icon={<TrendingUp />}
          href="/driver/earnings"
          accent="success"
        />
      </div>
    </section>
  )
}
