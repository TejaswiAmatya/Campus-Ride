import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CalendarCheck, MapPin, Clock, AlertCircle } from 'lucide-react'
import { api } from '@/api/client'
import { cn } from '@/lib/utils'

interface Booking {
  id: string
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'
  seatsBooked: number
  totalFare: string
  createdAt: string
  ride: {
    id: string
    originAddress: string
    destinationAddress: string
    departureTime: string
    driver: { name: string }
  }
}

const STATUS_STYLES: Record<Booking['status'], string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-600',
  COMPLETED: 'bg-blue-100 text-blue-800',
}

export function BookingsPage() {
  const queryClient = useQueryClient()
  const [view, setView] = useState<'passenger' | 'driver'>('passenger')

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['bookings', view],
    queryFn: async (): Promise<Booking[]> => {
      const res = await api.get<{ data: Booking[] }>(
        `/api/bookings${view === 'driver' ? '?asDriver=true' : ''}`,
      )
      return res.data.data ?? []
    },
  })

  const cancelMutation = useMutation({
    mutationFn: (bookingId: string) => api.patch(`/api/bookings/${bookingId}/cancel`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bookings'] }),
  })

  const confirmMutation = useMutation({
    mutationFn: (bookingId: string) => api.patch(`/api/bookings/${bookingId}/confirm`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bookings'] }),
  })

  const declineMutation = useMutation({
    mutationFn: (bookingId: string) => api.patch(`/api/bookings/${bookingId}/decline`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bookings'] }),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Bookings</h1>

        {/* Tab toggle: passenger view vs driver view */}
        <div className="flex rounded-lg border overflow-hidden text-sm">
          <button
            onClick={() => setView('passenger')}
            className={cn('px-4 py-2 transition-colors', view === 'passenger' && 'bg-primary text-primary-foreground')}
          >
            My bookings
          </button>
          <button
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
            <div key={i} className="h-28 rounded-lg border animate-pulse bg-muted" />
          ))}
        </div>
      ) : (bookings ?? []).length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <CalendarCheck className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">
            {view === 'passenger' ? 'No bookings yet.' : 'No ride requests.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {(bookings ?? []).map((booking) => (
            <div key={booking.id} className="rounded-lg border p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 truncate">
                    <MapPin className="h-4 w-4 shrink-0 text-primary" />
                    <span className="font-medium truncate">
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
                  <p className="text-xs text-muted-foreground">
                    Driver: {booking.ride.driver?.name}
                  </p>
                </div>

                <span
                  className={cn(
                    'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium',
                    STATUS_STYLES[booking.status],
                  )}
                >
                  {booking.status}
                </span>
              </div>

              {/* Action buttons */}
              <div className="mt-3 flex gap-2">
                {/* Passenger: can cancel a PENDING or CONFIRMED booking */}
                {view === 'passenger' && (booking.status === 'PENDING' || booking.status === 'CONFIRMED') && (
                  <button
                    onClick={() => cancelMutation.mutate(booking.id)}
                    disabled={cancelMutation.isPending}
                    className="flex items-center gap-1 rounded-md border border-destructive px-3 py-1 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-50"
                  >
                    <AlertCircle className="h-3 w-3" />
                    Cancel
                  </button>
                )}

                {/* Driver: can confirm or decline PENDING bookings */}
                {view === 'driver' && booking.status === 'PENDING' && (
                  <>
                    <button
                      onClick={() => confirmMutation.mutate(booking.id)}
                      disabled={confirmMutation.isPending}
                      className="rounded-md bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => declineMutation.mutate(booking.id)}
                      disabled={declineMutation.isPending}
                      className="rounded-md border px-3 py-1 text-xs hover:bg-muted disabled:opacity-50"
                    >
                      Decline
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
