import { Link, useParams } from 'react-router-dom'
import { Clock, MapPin, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MapView } from '@/components/MapView'
import { useAuth } from '@/hooks/useAuth'
import { useRide } from './hooks'

export function RideDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { data: ride, isLoading, isError } = useRide(id)

  const canBook =
    !!user &&
    !!ride &&
    ride.status === 'OPEN' &&
    ride.availableSeats > 0 &&
    user.id !== ride.driver.id

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="animate-pulse text-muted-foreground">Loading ride details…</p>
      </div>
    )
  }

  if (isError || !ride) {
    return (
      <div className="space-y-4 rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground">Ride details could not be loaded.</p>
        <Link to="/rides" className="text-sm font-medium text-primary hover:underline">
          Back to search
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">
          {ride.originAddress} → {ride.destinationAddress}
        </h1>
        <p className="text-sm text-muted-foreground">
          Driver: {ride.driver.name}
          {ride.driver.vehicle
            ? ` • ${ride.driver.vehicle.colour} ${ride.driver.vehicle.make} ${ride.driver.vehicle.model}`
            : ''}
        </p>
      </div>

      <MapView
        height="h-80"
        markers={[
          {
            position: [ride.originLat, ride.originLng],
            label: `Pickup: ${ride.originAddress}`,
            type: 'origin',
          },
          {
            position: [ride.destinationLat, ride.destinationLng],
            label: `Dropoff: ${ride.destinationAddress}`,
            type: 'destination',
          },
        ]}
      />

      <div className="grid gap-4 rounded-lg border p-5 sm:grid-cols-3">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Departure</p>
          <p className="flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4 text-primary" />
            {new Date(ride.departureTime).toLocaleString()}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Seats</p>
          <p className="flex items-center gap-2 text-sm font-medium">
            <Users className="h-4 w-4 text-primary" />
            {ride.availableSeats} available of {ride.totalSeats}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Price</p>
          <p className="text-sm font-medium">{ride.pricePerSeat} NOK per seat</p>
        </div>
      </div>

      <div className="grid gap-4 rounded-lg border p-5 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Pickup</p>
          <p className="flex items-start gap-2 text-sm">
            <MapPin className="mt-0.5 h-4 w-4 text-green-600" />
            {ride.originAddress}
          </p>
        </div>
        <div>
          <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Dropoff</p>
          <p className="flex items-start gap-2 text-sm">
            <MapPin className="mt-0.5 h-4 w-4 text-red-500" />
            {ride.destinationAddress}
          </p>
        </div>
      </div>

      {canBook && (
        <div className="flex justify-end">
          <Button asChild>
            <Link to={`/rides/${ride.id}/checkout`}>Book this ride</Link>
          </Button>
        </div>
      )}
    </div>
  )
}
