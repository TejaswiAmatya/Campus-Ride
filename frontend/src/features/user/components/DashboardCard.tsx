import type { ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

type DashboardCardProps = {
  title: string
  subtitle?: string
  icon?: ReactNode
  href?: string
  children?: ReactNode
  /** @deprecated Kept for call-site compatibility; icons use neutral soft styling. */
  accent?: string
  /** Large tile for dashboard grids. */
  size?: 'default' | 'hero'
  /** Polarity flip — black surface with white text (DESIGN.md promo-card-on-dark). */
  tone?: 'light' | 'dark' | 'soft' | 'dense'
}

export function DashboardCard({
  title,
  subtitle,
  icon,
  href,
  children,
  size = 'default',
  tone = 'light',
}: DashboardCardProps) {
  const isHero = size === 'hero'

  const card = (
    <article
      className={cn(
        'group relative flex flex-col rounded-xl transition-colors',
        isHero
          ? 'h-full min-h-0 justify-between gap-3 p-5 sm:gap-4 sm:p-6'
          : 'gap-3 p-6',
        tone === 'dark' && 'bg-primary text-primary-foreground',
        tone === 'soft' && 'bg-soft text-foreground',
        tone === 'dense' && 'bg-border text-foreground',
        tone === 'light' && 'bg-card text-foreground shadow-elev-1',
        href && tone === 'dark' && 'hover:bg-elevated',
        href && tone === 'soft' && 'hover:bg-border',
        href && tone === 'dense' && 'hover:bg-[hsl(0_0%_82%)]',
        href && tone === 'light' && 'hover:bg-soft',
      )}
    >
      {icon && (
        <div
          className={cn(
            'flex items-center justify-center rounded-pill',
            isHero ? 'h-10 w-10 [&>svg]:h-5 [&>svg]:w-5' : 'h-11 w-11 [&>svg]:h-5 [&>svg]:w-5',
            tone === 'dark' ? 'bg-white/10 text-primary-foreground' : 'bg-soft text-foreground',
            tone === 'soft' && 'bg-background',
            tone === 'dense' && 'bg-background',
          )}
        >
          {icon}
        </div>
      )}

      <div className="flex-1">
        <h3
          className={cn(
            isHero
              ? 'font-display text-display-sm sm:text-display-md'
              : 'text-sm font-medium',
            tone === 'dark' ? 'text-primary-foreground' : 'text-foreground',
          )}
        >
          {title}
        </h3>
        {subtitle && (
          <p
            className={cn(
              'mt-1 leading-relaxed',
              isHero ? 'max-w-sm text-sm' : 'text-xs',
              tone === 'dark' ? 'text-mute' : 'text-muted-foreground',
            )}
          >
            {subtitle}
          </p>
        )}
      </div>

      {children && <div className="mt-1">{children}</div>}

      {href && (
        <div
          className={cn(
            'flex items-center gap-1.5 text-sm font-medium',
            tone === 'dark' ? 'text-primary-foreground' : 'text-foreground',
          )}
        >
          <span className={cn(isHero ? 'inline' : 'sr-only')}>Open</span>
          <ArrowRight
            className={cn(
              'h-4 w-4 transition-transform duration-200 group-hover:translate-x-1',
              !isHero && 'absolute right-5 top-1/2 -translate-y-1/2 text-mute group-hover:text-foreground',
            )}
          />
        </div>
      )}
    </article>
  )

  if (!href) return card

  return (
    <Link to={href} className={cn('block no-underline', isHero && 'h-full')}>
      {card}
    </Link>
  )
}
