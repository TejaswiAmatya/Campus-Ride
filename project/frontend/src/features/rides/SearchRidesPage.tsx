import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronUp, MapPin, Plus, SlidersHorizontal, Star } from 'lucide-react'
import { MapView } from '@/components/MapView'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { RideCard } from './components/RideCard'
import { useSearchRides } from './hooks'

export function SearchRidesPage() {
  const { user } = useAuth()
  const [filters, setFilters] = useState({
    location: '',
    date: '',
    minPrice: '',
    maxPrice: '',
    minRating: '',
    sortBy: 'departureTime' as 'departureTime' | 'price' | 'rating',
  })
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  const { data: rides, isLoading } = useSearchRides({
    location: filters.location || undefined,
    origin: filters.location || undefined,
    date: filters.date || undefined,
    minPrice: filters.minPrice ? Number(filters.minPrice) : undefined,
    maxPrice: filters.maxPrice ? Number(filters.maxPrice) : undefined,
    minRating: filters.minRating ? Number(filters.minRating) : undefined,
    sortBy: filters.sortBy,
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

      <div className="rounded-lg border">
        <button
          type="button"
          onClick={() => setShowAdvancedFilters((value) => !value)}
          className="flex w-full items-center justify-between px-4 py-3 text-left"
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <SlidersHorizontal className="h-4 w-4" />
            Advanced filters
          </span>
          {showAdvancedFilters ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {showAdvancedFilters && (
          <div className="grid grid-cols-1 gap-4 border-t px-4 py-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Price range (NOK)</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min="0"
                  placeholder="Min"
                  value={filters.minPrice}
                  onChange={(event) => setFilters((prev) => ({ ...prev, minPrice: event.target.value }))}
                  className="rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <input
                  type="number"
                  min="0"
                  placeholder="Max"
                  value={filters.maxPrice}
                  onChange={(event) => setFilters((prev) => ({ ...prev, maxPrice: event.target.value }))}
                  className="rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Minimum driver rating</label>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((rating) => {
                  const isSelected = filters.minRating === String(rating)

                  return (
                    <Button
                      key={rating}
                      variant={isSelected ? 'default' : 'outline'}
                      size="sm"
                      onClick={() =>
                        setFilters((prev) => ({
                          ...prev,
                          minRating: prev.minRating === String(rating) ? '' : String(rating),
                        }))
                      }
                    >
                      <Star className="mr-1 h-3.5 w-3.5" />
                      {rating}+
                    </Button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Sort by</label>
              <select
                value={filters.sortBy}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    sortBy: event.target.value as 'departureTime' | 'price' | 'rating',
                  }))
                }
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="departureTime">Departure time</option>
                <option value="price">Price (low to high)</option>
                <option value="rating">Driver rating</option>
              </select>
            </div>
          </div>
        )}
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
