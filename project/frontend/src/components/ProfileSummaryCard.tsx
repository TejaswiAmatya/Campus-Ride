import type { AppRole } from '@/features/auth/routing'

type ProfileSummaryCardProps = {
  name: string
  email: string
  avatarUrl: string | null
  role: AppRole
}

const roleLabel: Record<AppRole, 'Passenger' | 'Driver' | 'Admin'> = {
  PASSENGER: 'Passenger',
  DRIVER: 'Driver',
  ADMIN: 'Admin',
}

export function ProfileSummaryCard({ name, email, avatarUrl, role }: ProfileSummaryCardProps) {
  const initial = (name.trim().charAt(0) || '?').toUpperCase()

  return (
    <section className="flex items-center gap-[var(--space-4)] rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-[var(--space-6)] shadow-[var(--shadow-sm)]">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={`${name} avatar`}
          className="h-12 w-12 rounded-[var(--radius-full)] object-cover"
        />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-full)] bg-[var(--color-primary)] text-[var(--text-sm)] text-white">
          {initial}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-[var(--text-base)] font-semibold text-[var(--color-text)]">{name}</p>
        <p className="truncate text-[var(--text-sm)] text-[var(--color-text-muted)]">{email}</p>
      </div>

      <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-1 text-[var(--text-xs)] uppercase text-[var(--color-text)]">
        {roleLabel[role]}
      </span>
    </section>
  )
}
