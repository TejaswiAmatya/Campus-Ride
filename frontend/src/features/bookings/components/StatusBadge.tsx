import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { BookingStatus } from '../types'

const VARIANT: Record<BookingStatus, 'success' | 'warning' | 'destructive' | 'secondary'> = {
  PENDING: 'warning',
  CONFIRMED: 'success',
  CANCELLED: 'destructive',
  COMPLETED: 'secondary',
}

const LABELS: Record<BookingStatus, string> = {
  PENDING: 'Waiting for driver',
  CONFIRMED: 'Accepted',
  CANCELLED: 'Cancelled',
  COMPLETED: 'Completed',
}

export function StatusBadge({
  status,
  className,
}: {
  status: BookingStatus
  className?: string
}) {
  return (
    <Badge variant={VARIANT[status]} className={cn(className)}>
      {LABELS[status]}
    </Badge>
  )
}
