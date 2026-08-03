import { useQuery } from '@tanstack/react-query'
import { Car, CirclePlus, History, TrendingUp } from 'lucide-react'
import { fetchMe } from '@/api/client'
import type { AppRole } from '@/features/auth/lib/routing'
import { DashboardCard } from '@/features/user/components/DashboardCard'
import { ProfileCompletionCard } from '@/features/user/components/ProfileCompletionCard'
import { ProfileSummaryCard } from '@/features/user/components/ProfileSummaryCard'

export function DriverDashboardPage() {
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: fetchMe })
  const role: AppRole = user?.role ?? 'DRIVER'
  const firstName = user?.name?.split(' ')[0] ?? 'Driver'

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-slate-400">Dashboard</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-800">Welcome back, {firstName}</h1>
      </div>

      <ProfileSummaryCard
        name={user?.name ?? 'Driver'}
        email={user?.email ?? 'driver@example.com'}
        avatarUrl={user?.avatarPath ?? null}
        role={role}
      />

      {user ? <ProfileCompletionCard user={user} /> : null}

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
    </div>
  )
}
