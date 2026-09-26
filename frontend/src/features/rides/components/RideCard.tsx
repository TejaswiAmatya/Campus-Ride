import { Link } from 'react-router-dom'
import { Clock, MapPin, Star, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Ride } from '../types'

export function RideCard({ ride }: { ride: Ride }) {
  return (
    <div className="flex items-start justify-between rounded-xl bg-background p-4 transition-colors hover:bg-soft">
      <div className="min-w-0 flex-1 space-y-1.5 pr-4">
        <div className="flex items-center gap-2 truncate font-medium">
          <MapPin className="h-4 w-4 shrink-0 text-foreground" />
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
            <Star className="h-3.5 w-3.5 text-foreground" />
            {ride.driverRating ? `${ride.driverRating.toFixed(1)} / 5` : 'No ratings yet'}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">Driver: {ride.driver?.name}</p>
      </div>
      <Button asChild variant="outline" size="sm">
        <Link to={`/rides/${ride.id}`}>View</Link>
      </Button>
    </div>
  )
}
