import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

type DashboardCardProps = {
  title: string
  subtitle?: string
  icon?: ReactNode
  href?: string
  children?: ReactNode
  accent?: 'primary' | 'warning' | 'success'
}

const accentColorClass: Record<NonNullable<DashboardCardProps['accent']> | 'default', string> = {
  primary: 'text-[var(--color-primary)]',
  warning: 'text-[var(--color-warning)]',
  success: 'text-[var(--color-success)]',
  default: 'text-[var(--color-text-muted)]',
}

export function DashboardCard({ title, subtitle, icon, href, children, accent }: DashboardCardProps) {
  const card = (
    <article className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-[var(--space-6)] shadow-[var(--shadow-sm)] transition-shadow duration-[180ms] ease-in hover:shadow-[var(--shadow-md)]">
      {icon ? (
        <div className={`h-6 w-6 ${accentColorClass[accent ?? 'default']} [&>svg]:h-6 [&>svg]:w-6`}>
          {icon}
        </div>
      ) : null}

      <h3 className={`text-[var(--text-base)] font-semibold text-[var(--color-text)] ${icon ? 'mt-[var(--space-2)]' : ''}`}>
        {title}
      </h3>

      {subtitle ? <p className="text-[var(--text-sm)] text-[var(--color-text-muted)]">{subtitle}</p> : null}

      {children ? <div className="mt-[var(--space-4)]">{children}</div> : null}
    </article>
  )

  if (!href) return card

  return (
    <Link to={href} className="block no-underline">
      {card}
    </Link>
  )
}
