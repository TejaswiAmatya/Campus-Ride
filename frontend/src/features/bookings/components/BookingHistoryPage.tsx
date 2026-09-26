import { Link } from 'react-router-dom'
import { useState } from 'react'
import { CalendarCheck, Clock, MapPin } from 'lucide-react'
import { useBookings } from '../hooks/useBookings'
import type { BookingListItem, BookingStatus } from '../types'
import { StatusBadge } from './StatusBadge'
import { cn } from '@/lib/utils'

type StatusFilter = 'ALL' | BookingStatus

const FILTERS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Confirmed', value: 'CONFIRMED' },
  { label: 'Cancelled', value: 'CANCELLED' },
  { label: 'Completed', value: 'COMPLETED' },
]

export function BookingHistoryPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const { data: bookings, isLoading } = useBookings({
    status: statusFilter === 'ALL' ? undefined : statusFilter,
  })

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-display text-display-lg text-foreground">Booking history</h1>
        <p className="text-sm text-muted-foreground">
          Track your upcoming and past bookings in one place.
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Booking status filters">
        {FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            role="tab"
            aria-selected={statusFilter === filter.value}
            aria-pressed={statusFilter === filter.value}
            onClick={() => setStatusFilter(filter.value)}
            className={cn(
              'rounded-pill px-3 py-1.5 text-sm font-medium transition-colors',
              statusFilter === filter.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-soft text-foreground hover:bg-border',
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-soft" />
          ))}
        </div>
      ) : (bookings ?? []).length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <CalendarCheck className="mx-auto mb-3 h-10 w-10 text-mute" />
          <p className="text-muted-foreground">
            No bookings found{statusFilter === 'ALL' ? '.' : ` for ${statusFilter.toLowerCase()}.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {(bookings ?? []).map((booking) => (
            <BookingCard key={booking.id} booking={booking} />
          ))}
        </div>
      )}
    </div>
  )
}

function BookingCard({ booking }: { booking: BookingListItem }) {
  return (
    <div className="rounded-xl bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-center gap-2 truncate">
            <MapPin className="h-4 w-4 shrink-0 text-foreground" />
            <p className="truncate font-medium">
              {booking.ride.originAddress} → {booking.ride.destinationAddress}
            </p>
          </div>

          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {new Date(booking.ride.departureTime).toLocaleString('en-GB', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
            <span>{booking.seatsBooked} seat(s)</span>
            <span className="font-medium text-foreground">{booking.totalFare} NOK</span>
          </div>
          <p className="text-xs text-muted-foreground">Driver: {booking.ride.driver.name}</p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <StatusBadge status={booking.status} />
          <Link to={`/rides/${booking.ride.id}`} className="text-xs font-medium text-foreground underline-offset-4 hover:underline">
            View details
          </Link>
        </div>
      </div>
    </div>
  )
}
