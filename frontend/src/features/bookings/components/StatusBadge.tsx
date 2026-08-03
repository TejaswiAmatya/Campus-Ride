import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { BookingStatus } from '../types'

const VARIANT: Record<BookingStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PENDING: 'secondary',
  CONFIRMED: 'default',
  CANCELLED: 'outline',
  COMPLETED: 'default',
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
    <Badge variant={VARIANT[status]} className={cn('font-medium', className)}>
      {LABELS[status]}
    </Badge>
  )
}
