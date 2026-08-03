import { Link } from 'react-router-dom'
import { Clock, MapPin, Star, Users } from 'lucide-react'
import type { Ride } from '../types'

export function RideCard({ ride }: { ride: Ride }) {
  return (
    <div className="flex items-start justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50">
      <div className="min-w-0 flex-1 space-y-1.5 pr-4">
        <div className="flex items-center gap-2 truncate font-medium">
          <MapPin className="h-4 w-4 shrink-0 text-primary" />
          <span className="truncate">
            {ride.originAddress} → {ride.destinationAddress}
          </span>
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {new Date(ride.departureTime).toLocaleString('en-GB', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {ride.availableSeats} / {ride.totalSeats} seats
          </span>
          <span className="font-medium text-foreground">{ride.pricePerSeat} NOK / seat</span>
          <span className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5 text-amber-500" />
            {ride.driverRating ? `${ride.driverRating.toFixed(1)} / 5` : 'No ratings yet'}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">Driver: {ride.driver?.name}</p>
      </div>
      <Link
        to={`/rides/${ride.id}`}
        className="shrink-0 rounded-md border border-primary px-3 py-1.5 text-sm text-primary transition-colors hover:bg-primary/10"
      >
        View
      </Link>
    </div>
  )
}
