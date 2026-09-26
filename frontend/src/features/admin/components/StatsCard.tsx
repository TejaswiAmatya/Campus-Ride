import type { ReactNode } from 'react'

import { Card, CardContent } from '@/components/ui/card'

interface StatsCardProps {
  title: string
  value: number | string
  icon?: ReactNode
}

export function StatsCard({ title, value, icon }: StatsCardProps) {
  return (
    <Card className="rounded-xl bg-card">
      <CardContent className="space-y-2 p-4">
        {icon ? (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-soft text-foreground [&>svg]:h-5 [&>svg]:w-5">
            {icon}
          </div>
        ) : null}
        <p className="font-display text-display-md text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{title}</p>
      </CardContent>
    </Card>
  )
}
