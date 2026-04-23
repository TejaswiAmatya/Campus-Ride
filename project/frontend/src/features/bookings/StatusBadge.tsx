import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { BookingStatus } from './types'

const VARIANT: Record<BookingStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PENDING: 'secondary',
  CONFIRMED: 'default',
  CANCELLED: 'outline',
  COMPLETED: 'default',
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
      {status}
    </Badge>
  )
}
