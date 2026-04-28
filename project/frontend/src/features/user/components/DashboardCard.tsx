import type { ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

type Accent = 'blue' | 'emerald' | 'amber' | 'violet' | 'rose'

type DashboardCardProps = {
  title: string
  subtitle?: string
  icon?: ReactNode
  href?: string
  children?: ReactNode
  accent?: 'primary' | 'warning' | 'success' | Accent
}

const iconBg: Record<string, string> = {
  primary: 'bg-blue-50 text-blue-600',
  blue:    'bg-blue-50 text-blue-600',
  warning: 'bg-amber-50 text-amber-600',
  amber:   'bg-amber-50 text-amber-600',
  success: 'bg-emerald-50 text-emerald-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  violet:  'bg-violet-50 text-violet-600',
  rose:    'bg-rose-50 text-rose-600',
}

export function DashboardCard({
  title,
  subtitle,
  icon,
  href,
  children,
  accent = 'primary',
}: DashboardCardProps) {
  const colorKey = accent ?? 'primary'

  const card = (
    <article
      className={cn(
        'group relative flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-6',
        'shadow-sm transition-all duration-200',
        href && 'cursor-pointer hover:border-slate-200 hover:shadow-md hover:-translate-y-0.5',
      )}
    >
      {icon && (
        <div
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-xl [&>svg]:h-5 [&>svg]:w-5',
            iconBg[colorKey] ?? iconBg.primary,
          )}
        >
          {icon}
        </div>
      )}

      <div className="flex-1">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {subtitle && (
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{subtitle}</p>
        )}
      </div>

      {children && <div className="mt-1">{children}</div>}

      {href && (
        <ArrowRight className="absolute right-5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-slate-500" />
      )}
    </article>
  )

  if (!href) return card

  return (
    <Link to={href} className="block no-underline">
      {card}
    </Link>
  )
}
