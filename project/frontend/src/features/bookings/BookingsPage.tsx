import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CalendarCheck, MapPin, Clock, AlertCircle } from 'lucide-react'
import { api } from '@/api/client'
import { cn } from '@/lib/utils'
import {
  useBookings,
  useDriverBookingNewListener,
  usePassengerBookingStatusListener,
} from './hooks'
import { StatusBadge } from './StatusBadge'
import type { BookingListItem } from './types'

export function BookingsPage() {
  const queryClient = useQueryClient()
  const [view, setView] = useState<'passenger' | 'driver'>('passenger')
  const asDriver = view === 'driver'
  useDriverBookingNewListener(asDriver)
  usePassengerBookingStatusListener(!asDriver)
  const { data: bookings, isLoading } = useBookings({ asDriver })

  const invalidateBookingsAndRides = () => {
    void queryClient.invalidateQueries({ queryKey: ['bookings'] })
    void queryClient.invalidateQueries({ queryKey: ['rides'] })
  }

  const cancelMutation = useMutation({
    mutationFn: (bookingId: string) => api.patch(`/api/bookings/${bookingId}/cancel`),
    onSuccess: invalidateBookingsAndRides,
  })

  const confirmMutation = useMutation({
    mutationFn: (bookingId: string) => api.patch(`/api/bookings/${bookingId}/confirm`),
    onSuccess: invalidateBookingsAndRides,
  })

  const declineMutation = useMutation({
    mutationFn: (bookingId: string) => api.patch(`/api/bookings/${bookingId}/decline`),
    onSuccess: invalidateBookingsAndRides,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Bookings</h1>

        <div className="flex overflow-hidden rounded-lg border text-sm">
          <button
            type="button"
            onClick={() => setView('passenger')}
            className={cn('px-4 py-2 transition-colors', view === 'passenger' && 'bg-primary text-primary-foreground')}
          >
            My bookings
          </button>
          <button
            type="button"
            onClick={() => setView('driver')}
            className={cn('px-4 py-2 transition-colors', view === 'driver' && 'bg-primary text-primary-foreground')}
          >
            Ride requests
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-lg border bg-muted" />
          ))}
        </div>
      ) : (bookings ?? []).length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <CalendarCheck className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-muted-foreground">
            {view === 'passenger' ? 'No bookings yet.' : 'No ride requests.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {(bookings ?? []).map((booking) => (
            <BookingRow
              key={booking.id}
              booking={booking}
              view={view}
              cancelPending={cancelMutation.isPending}
              confirmPending={confirmMutation.isPending}
              declinePending={declineMutation.isPending}
              onCancel={() => cancelMutation.mutate(booking.id)}
              onConfirm={() => confirmMutation.mutate(booking.id)}
              onDecline={() => declineMutation.mutate(booking.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function BookingRow({
  booking,
  view,
  cancelPending,
  confirmPending,
  declinePending,
  onCancel,
  onConfirm,
  onDecline,
}: {
  booking: BookingListItem
  view: 'passenger' | 'driver'
  cancelPending: boolean
  confirmPending: boolean
  declinePending: boolean
  onCancel: () => void
  onConfirm: () => void
  onDecline: () => void
}) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-center gap-2 truncate">
            <MapPin className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate font-medium">
              {booking.ride.originAddress} → {booking.ride.destinationAddress}
            </span>
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
            <span>{booking.totalFare} NOK</span>
          </div>
          {view === 'passenger' && (
            <p className="text-xs text-muted-foreground">Driver: {booking.ride.driver?.name}</p>
          )}
          {view === 'driver' && booking.passenger && (
            <p className="text-xs text-muted-foreground">Passenger: {booking.passenger.name}</p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <StatusBadge status={booking.status} />
          <Link
            to={`/bookings/${booking.id}`}
            className="text-xs font-medium text-primary hover:underline"
          >
            Details
          </Link>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        {view === 'passenger' && (booking.status === 'PENDING' || booking.status === 'CONFIRMED') && (
          <button
            type="button"
            onClick={onCancel}
            disabled={cancelPending}
            className="flex items-center gap-1 rounded-md border border-destructive px-3 py-1 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-50"
          >
            <AlertCircle className="h-3 w-3" />
            Cancel
          </button>
        )}

        {view === 'driver' && booking.status === 'PENDING' && (
          <>
            <button
              type="button"
              onClick={onConfirm}
              disabled={confirmPending}
              className="rounded-md bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700 disabled:opacity-50"
            >
              Accept
            </button>
            <button
              type="button"
              onClick={onDecline}
              disabled={declinePending}
              className="rounded-md border px-3 py-1 text-xs hover:bg-muted disabled:opacity-50"
            >
              Decline
            </button>
          </>
        )}
      </div>
    </div>
  )
}
