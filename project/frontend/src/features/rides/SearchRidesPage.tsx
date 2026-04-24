import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Plus } from 'lucide-react'
import { MapView } from '@/components/MapView'
import { useAuth } from '@/hooks/useAuth'
import { RideCard } from './components/RideCard'
import { useSearchRides } from './hooks'

export function SearchRidesPage() {
  const { user } = useAuth()
  const [filters, setFilters] = useState({
    location: '',
    date: '',
  })

  const { data: rides, isLoading } = useSearchRides({
    location: filters.location || undefined,
    origin: filters.location || undefined,
    date: filters.date || undefined,
  })

  const markers = (rides ?? []).flatMap((ride) => [
    {
      position: [ride.originLat, ride.originLng] as [number, number],
      label: `Pickup: ${ride.originAddress}`,
      type: 'origin' as const,
    },
    {
      position: [ride.destinationLat, ride.destinationLng] as [number, number],
      label: `Dropoff: ${ride.destinationAddress}`,
      type: 'destination' as const,
    },
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Find a Ride</h1>
        {user?.role === 'DRIVER' && user.isDriverApproved && (
          <Link
            to="/rides/post"
            className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Post a Ride
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-lg border p-4 sm:grid-cols-2">
        <input
          placeholder="Campus, station, or area"
          value={filters.location}
          onChange={(event) => setFilters((prev) => ({ ...prev, location: event.target.value }))}
          className="rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <input
          type="date"
          value={filters.date}
          onChange={(event) => setFilters((prev) => ({ ...prev, date: event.target.value }))}
          className="rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <MapView markers={markers} height="h-72" />

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-24 animate-pulse rounded-lg border bg-muted" />
          ))}
        </div>
      ) : (rides ?? []).length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <MapPin className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-muted-foreground">No rides found. Try another date or location.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(rides ?? []).map((ride) => (
            <RideCard key={ride.id} ride={ride} />
          ))}
        </div>
      )}
    </div>
  )
}
