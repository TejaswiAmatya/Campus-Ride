import type { ReactNode } from 'react'

interface StatsCardProps {
  title: string
  value: number | string
  icon?: ReactNode
}

export function StatsCard({ title, value, icon }: StatsCardProps) {
  return (
    <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
      <div className="space-y-1">
        {icon ? <div className="[&>svg]:h-5 [&>svg]:w-5">{icon}</div> : null}
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{title}</p>
      </div>
    </div>
  )
}
