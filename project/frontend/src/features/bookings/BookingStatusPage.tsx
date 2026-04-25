import { Link, useParams } from 'react-router-dom'
import { CalendarCheck, MapPin, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MapView } from '@/components/MapView'
import { useBooking, useCancelBooking, usePassengerBookingStatusListener } from './hooks'
import { StatusBadge } from './StatusBadge'
import { useRideStatusListener } from '@/features/rides/hooks'

export function BookingStatusPage() {
  const { id } = useParams<{ id: string }>()
  const { data: booking, isLoading, isError } = useBooking(id)
  usePassengerBookingStatusListener(true)
  useRideStatusListener({ rideId: booking?.ride.id, bookingId: booking?.id, enabled: true })
  const cancelMutation = useCancelBooking()

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="animate-pulse text-muted-foreground">Loading booking…</p>
      </div>
    )
  }

  if (isError || !booking) {
    return (
      <div className="mx-auto max-w-lg space-y-4 rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground">Booking not found or you do not have access.</p>
        <Button asChild variant="outline">
          <Link to="/bookings">Back to bookings</Link>
        </Button>
      </div>
    )
  }

  const canCancel = booking.status === 'PENDING' || booking.status === 'CONFIRMED'

  const handleCancel = () => {
    if (!booking.id || !canCancel || cancelMutation.isPending) return
    const confirmed = window.confirm(
      'Cancel this booking? The reserved seat(s) will be released back to the ride.',
    )
    if (!confirmed) return
    cancelMutation.mutate(booking.id)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Booking status</h1>
          <p className="text-sm text-muted-foreground">Reference #{booking.id.slice(0, 8)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={booking.status} className="text-sm" />
          <Badge
            variant={
              booking.ride.status === 'IN_PROGRESS'
                ? 'default'
                : booking.ride.status === 'COMPLETED'
                  ? 'outline'
                  : booking.ride.status === 'CANCELLED'
                    ? 'destructive'
                    : 'secondary'
            }
            className="text-sm"
          >
            Ride {booking.ride.status === 'IN_PROGRESS' ? 'In Progress' : booking.ride.status}
          </Badge>
        </div>
      </div>

      {(booking.ride.status === 'IN_PROGRESS' || booking.ride.status === 'COMPLETED') && (
        <div
          className={
            booking.ride.status === 'IN_PROGRESS'
              ? 'rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900'
              : 'rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900'
          }
        >
          <p className="text-sm font-semibold">
            {booking.ride.status === 'IN_PROGRESS' ? 'Your ride is underway' : 'Your ride has finished'}
          </p>
          <p className="text-sm">
            {booking.ride.status === 'IN_PROGRESS'
              ? 'This page updates live when the driver starts the ride.'
              : 'The ride has completed. Any follow-up actions will now use the completed state.'}
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-5 w-5 text-primary" />
            {booking.ride.originAddress} → {booking.ride.destinationAddress}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CalendarCheck className="h-4 w-4" />
              {new Date(booking.ride.departureTime).toLocaleString()}
            </span>
            <span>{booking.seatsBooked} seat(s)</span>
            <span className="font-medium text-foreground">{booking.totalFare} NOK total</span>
          </div>
          <p className="text-sm">
            Driver: <span className="font-medium">{booking.ride.driver.name}</span>
          </p>
        </CardContent>
      </Card>

      <MapView
        height="h-64"
        markers={[
          {
            position: [booking.ride.originLat, booking.ride.originLng],
            label: `Pickup: ${booking.ride.originAddress}`,
            type: 'origin',
          },
          {
            position: [booking.ride.destinationLat, booking.ride.destinationLng],
            label: `Dropoff: ${booking.ride.destinationAddress}`,
            type: 'destination',
          },
        ]}
      />

      <div className="flex gap-2">
        {canCancel && (
          <Button
            type="button"
            variant="destructive"
            disabled={cancelMutation.isPending}
            onClick={handleCancel}
          >
            <AlertCircle className="mr-1.5 h-4 w-4" />
            {cancelMutation.isPending ? 'Cancelling…' : 'Cancel Booking'}
          </Button>
        )}
        <Button asChild variant="outline">
          <Link to="/rides">Find more rides</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/bookings">All bookings</Link>
        </Button>
      </div>
      {cancelMutation.isError && (
        <p className="text-sm text-destructive">
          Could not cancel this booking. It may have been updated already.
        </p>
      )}
    </div>
  )
}
