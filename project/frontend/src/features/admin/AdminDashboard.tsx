import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { LayoutDashboard, Users, Car, BookOpen, DollarSign, FileWarning, CheckCircle, XCircle } from 'lucide-react'
import { api } from '@/api/client'

interface Stats {
  activeRides: number
  pendingDrivers: number
  openReports: number
  totalUsers: number
  revenueAllTime: string
}

interface PendingDriver {
  id: string
  name: string
  email: string
  licenceUrl?: string
  vehicle?: { make: string; model: string; year: number; plateNumber: string }
  createdAt: string
}

export function AdminDashboard() {
  const queryClient = useQueryClient()

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async (): Promise<Stats> => {
      const res = await api.get<{ data: Stats }>('/api/admin/stats')
      return res.data.data
    },
  })

  const { data: pendingDrivers } = useQuery({
    queryKey: ['admin', 'drivers', 'pending'],
    queryFn: async (): Promise<PendingDriver[]> => {
      const res = await api.get<{ data: PendingDriver[] }>('/api/admin/drivers/pending')
      return res.data.data ?? []
    },
  })

  const driverDecisionMutation = useMutation({
    mutationFn: ({ id, approved }: { id: string; approved: boolean }) =>
      api.patch(`/api/admin/drivers/${id}/decision`, { approved }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin'] })
    },
  })

  if (statsLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-lg border animate-pulse bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2">
        <LayoutDashboard className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard icon={<Car />} label="Active rides" value={stats?.activeRides ?? 0} />
        <StatCard icon={<Users />} label="Total users" value={stats?.totalUsers ?? 0} />
        <StatCard icon={<BookOpen />} label="Pending drivers" value={stats?.pendingDrivers ?? 0} accent="yellow" />
        <StatCard icon={<FileWarning />} label="Open reports" value={stats?.openReports ?? 0} accent="red" />
        <StatCard icon={<DollarSign />} label="Revenue (all-time)" value={`${stats?.revenueAllTime ?? 0} NOK`} />
      </div>

      {/* Pending driver approvals */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Pending Driver Applications</h2>
        {(pendingDrivers ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending applications.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Applicant</th>
                  <th className="px-4 py-3 text-left font-medium">Email</th>
                  <th className="px-4 py-3 text-left font-medium">Vehicle</th>
                  <th className="px-4 py-3 text-left font-medium">Licence</th>
                  <th className="px-4 py-3 text-left font-medium">Applied</th>
                  <th className="px-4 py-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(pendingDrivers ?? []).map((driver) => (
                  <tr key={driver.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{driver.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{driver.email}</td>
                    <td className="px-4 py-3">
                      {driver.vehicle
                        ? `${driver.vehicle.year} ${driver.vehicle.make} ${driver.vehicle.model} (${driver.vehicle.plateNumber})`
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {driver.licenceUrl ? (
                        <a
                          href={driver.licenceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          View
                        </a>
                      ) : (
                        <span className="text-muted-foreground">Not uploaded</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(driver.createdAt).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => driverDecisionMutation.mutate({ id: driver.id, approved: true })}
                          disabled={driverDecisionMutation.isPending}
                          className="flex items-center gap-1 rounded-md bg-green-600 px-2.5 py-1 text-xs text-white hover:bg-green-700 disabled:opacity-50"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          Approve
                        </button>
                        <button
                          onClick={() => driverDecisionMutation.mutate({ id: driver.id, approved: false })}
                          disabled={driverDecisionMutation.isPending}
                          className="flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs hover:bg-muted disabled:opacity-50"
                        >
                          <XCircle className="h-3.5 w-3.5 text-destructive" />
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* TODO Sprint 2: Reports table */}
      {/* TODO Sprint 2: Config editor (platform fee) */}
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  accent?: 'yellow' | 'red'
}) {
  const accentClass = accent === 'yellow'
    ? 'text-yellow-600'
    : accent === 'red'
      ? 'text-destructive'
      : 'text-primary'

  return (
    <div className="rounded-lg border p-4 space-y-1">
      <div className={`${accentClass} [&>svg]:h-5 [&>svg]:w-5`}>{icon}</div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
