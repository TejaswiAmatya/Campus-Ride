import type { AppRole } from '@/features/auth/routing'

type ProfileSummaryCardProps = {
  name: string
  email: string
  avatarUrl: string | null
  role: AppRole
}

const roleMeta: Record<AppRole, { label: string; className: string }> = {
  PASSENGER: {
    label: 'Passenger',
    className: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  },
  DRIVER: {
    label: 'Driver',
    className: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  },
  ADMIN: {
    label: 'Admin',
    className: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
  },
}

export function ProfileSummaryCard({
  name,
  email,
  avatarUrl,
  role,
}: ProfileSummaryCardProps) {
  const initial = (name.trim().charAt(0) || '?').toUpperCase()
  const { label, className } = roleMeta[role]

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white px-6 py-5 shadow-sm">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={`${name} avatar`}
          className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-slate-100"
        />
      ) : (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-base font-semibold text-white shadow-sm">
          {initial}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-800">{name}</p>
        <p className="truncate text-xs text-slate-500">{email}</p>
      </div>

      <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${className}`}>
        {label}
      </span>
    </div>
  )
}
