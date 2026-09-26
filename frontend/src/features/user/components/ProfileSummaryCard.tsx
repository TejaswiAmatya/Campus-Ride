import type { AppRole } from '@/features/auth/lib/routing'
import { Badge } from '@/components/ui/badge'

type ProfileSummaryCardProps = {
  name: string
  email: string
  avatarUrl: string | null
  role: AppRole
}

const roleLabels: Record<AppRole, string> = {
  PASSENGER: 'Passenger',
  DRIVER: 'Driver',
  ADMIN: 'Admin',
}

export function ProfileSummaryCard({
  name,
  email,
  avatarUrl,
  role,
}: ProfileSummaryCardProps) {
  const initial = (name.trim().charAt(0) || '?').toUpperCase()

  return (
    <div className="flex items-center gap-4 rounded-xl bg-card px-6 py-5">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={`${name} avatar`}
          className="h-12 w-12 shrink-0 rounded-full object-cover"
        />
      ) : (
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-soft font-display text-base font-semibold text-foreground">
          {initial}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{name}</p>
        <p className="truncate text-xs text-muted-foreground">{email}</p>
      </div>

      <Badge variant="secondary" className="shrink-0">
        {roleLabels[role]}
      </Badge>
    </div>
  )
}
