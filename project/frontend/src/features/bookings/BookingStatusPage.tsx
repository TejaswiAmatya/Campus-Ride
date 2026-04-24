import { Link, useParams } from 'react-router-dom'
import { CalendarCheck, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MapView } from '@/components/MapView'
import { useBooking } from './hooks'
import { StatusBadge } from './StatusBadge'

export function BookingStatusPage() {
  const { id } = useParams<{ id: string }>()
  const { data: booking, isLoading, isError } = useBooking(id)

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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Booking status</h1>
          <p className="text-sm text-muted-foreground">Reference #{booking.id.slice(0, 8)}</p>
        </div>
        <StatusBadge status={booking.status} className="text-sm" />
      </div>

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
        <Button asChild variant="outline">
          <Link to="/rides">Find more rides</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/bookings">All bookings</Link>
        </Button>
      </div>
    </div>
  )
}
