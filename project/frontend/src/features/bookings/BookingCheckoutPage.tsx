import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { MapPin, Users, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useRide } from '@/features/rides/hooks'
import { useBookRide } from './hooks'

export function BookingCheckoutPage() {
  const { rideId } = useParams<{ rideId: string }>()
  const { data: ride, isLoading, isError } = useRide(rideId)
  const [seats, setSeats] = useState(1)
  const bookMutation = useBookRide()

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="animate-pulse text-muted-foreground">Loading ride…</p>
      </div>
    )
  }

  if (isError || !ride) {
    return (
      <div className="mx-auto max-w-lg space-y-4 rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground">This ride could not be loaded.</p>
        <Button asChild variant="outline">
          <Link to="/rides">Back to rides</Link>
        </Button>
      </div>
    )
  }

  const maxBookable = Math.min(ride.availableSeats, 8)
  const estimatedTotal = (Number(ride.pricePerSeat) * seats).toFixed(2)

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Book seats</h1>
        <p className="text-sm text-muted-foreground">Payment is simulated in later sprints — you only reserve seats here.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-start gap-2 text-lg">
            <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <span>
              {ride.originAddress} → {ride.destinationAddress}
            </span>
          </CardTitle>
          <CardDescription>
            {new Date(ride.departureTime).toLocaleString()} · {ride.availableSeats} seat(s) left
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="seats" className="flex items-center gap-2 text-sm font-medium">
              <Users className="h-4 w-4" />
              Seats to book
            </label>
            <Input
              id="seats"
              type="number"
              min={1}
              max={maxBookable}
              value={seats}
              onChange={(e) => setSeats(Math.max(1, Math.min(maxBookable, Number(e.target.value) || 1)))}
            />
            <p className="text-xs text-muted-foreground">
              {ride.pricePerSeat} NOK × {seats} = <span className="font-medium text-foreground">{estimatedTotal} NOK</span>{' '}
              (estimated)
            </p>
          </div>

          {bookMutation.isError && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Could not complete booking. The ride may be full or no longer available. Try refreshing the ride page.
              </span>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link to={`/rides/${ride.id}`}>Cancel</Link>
          </Button>
          <Button
            disabled={bookMutation.isPending || ride.availableSeats < 1 || seats < 1 || seats > maxBookable}
            onClick={() => bookMutation.mutate({ rideId: ride.id, seatsBooked: seats })}
          >
            {bookMutation.isPending ? 'Booking…' : 'Book now'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
