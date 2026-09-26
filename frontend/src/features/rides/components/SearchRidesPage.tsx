import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, LocateFixed, MapPin, SlidersHorizontal, Star, Users } from 'lucide-react'
import { MapView } from '@/features/rides/components/MapView'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { reverseGeocode, type GeocodingSuggestion } from '../lib/geocoding'
import { useSearchRides } from '../hooks/useRides'
import { RideCard } from './RideCard'
import { RidePreferencesInput } from './RidePreferencesInput'
import { RouteInputForm, type RouteInputValue } from './RouteInputForm'

export function SearchRidesPage() {
  const { user } = useAuth()
  const [pickup, setPickup] = useState<RouteInputValue>({ address: '', lat: null, lng: null })
  const [dropoff, setDropoff] = useState<RouteInputValue>({ address: '', lat: null, lng: null })
  const [mapSelectionTarget, setMapSelectionTarget] = useState<'origin' | 'destination' | null>(null)
  const [preferences, setPreferences] = useState<string[]>([])
  const [seats, setSeats] = useState('1')
  const [filters, setFilters] = useState({
    date: '',
    minPrice: '',
    maxPrice: '',
    minRating: '',
    earliestDepartureTime: '',
    latestDepartureTime: '',
    sortBy: 'bestMatch' as 'bestMatch' | 'departureTime' | 'price' | 'rating',
  })
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  const handleAddressInput = (segment: 'origin' | 'destination', value: string) => {
    if (segment === 'origin') {
      setPickup({ address: value, lat: null, lng: null })
    } else {
      setDropoff({ address: value, lat: null, lng: null })
    }
  }

  const handleSuggestionSelect = (segment: 'origin' | 'destination', suggestion: GeocodingSuggestion) => {
    if (segment === 'origin') {
      setPickup({ address: suggestion.address, lat: suggestion.lat, lng: suggestion.lng })
    } else {
      setDropoff({ address: suggestion.address, lat: suggestion.lat, lng: suggestion.lng })
    }
  }

  const { data: rides, isLoading } = useSearchRides({
    pickup: pickup.address || undefined,
    dropoff: dropoff.address || undefined,
    pickupLat: pickup.lat ?? undefined,
    pickupLng: pickup.lng ?? undefined,
    dropoffLat: dropoff.lat ?? undefined,
    dropoffLng: dropoff.lng ?? undefined,
    date: filters.date || undefined,
    seats: Number(seats) || 1,
    minPrice: filters.minPrice ? Number(filters.minPrice) : undefined,
    maxPrice: filters.maxPrice ? Number(filters.maxPrice) : undefined,
    minRating: filters.minRating ? Number(filters.minRating) : undefined,
    preferences: preferences.length > 0 ? preferences : undefined,
    earliestDepartureTime: filters.earliestDepartureTime ? new Date(filters.earliestDepartureTime).toISOString() : undefined,
    latestDepartureTime: filters.latestDepartureTime ? new Date(filters.latestDepartureTime).toISOString() : undefined,
    sortBy: filters.sortBy,
  })
  const visibleRides = useMemo(
    () => (rides ?? []).filter((ride) => ride.driver.id !== user?.id),
    [rides, user?.id],
  )

  const markers = useMemo(
    () => [
      ...(pickup.lat !== null && pickup.lng !== null
        ? [{ position: [pickup.lat, pickup.lng] as [number, number], label: `Pickup: ${pickup.address}`, type: 'origin' as const }]
        : []),
      ...(dropoff.lat !== null && dropoff.lng !== null
        ? [{ position: [dropoff.lat, dropoff.lng] as [number, number], label: `Drop-off: ${dropoff.address}`, type: 'destination' as const }]
        : []),
      ...(visibleRides.flatMap((ride) => [
        {
          position: [ride.originLat, ride.originLng] as [number, number],
          label: `Ride start: ${ride.originAddress}`,
          type: 'default' as const,
        },
      ])),
    ],
    [dropoff.address, dropoff.lat, dropoff.lng, pickup.address, pickup.lat, pickup.lng, visibleRides],
  )

  const handleMapClick = async (position: [number, number]) => {
    if (!mapSelectionTarget) return
    const suggestion = await reverseGeocode(position[0], position[1])
    handleSuggestionSelect(mapSelectionTarget, suggestion)
    setMapSelectionTarget(null)
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-display text-display-lg text-foreground">Find the best ride for your route</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Match by pickup, drop-off, timing, seats, route fit, and ride preferences instead of plain distance alone.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4 rounded-xl bg-background p-4 shadow-elev-2">
          <RouteInputForm
            origin={pickup}
            destination={dropoff}
            mapSelectionTarget={mapSelectionTarget}
            onAddressInput={handleAddressInput}
            onSelectSuggestion={handleSuggestionSelect}
            onPickFromMap={(segment) => setMapSelectionTarget((current) => (current === segment ? null : segment))}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Travel date</label>
              <Input
                type="date"
                value={filters.date}
                onChange={(event) => setFilters((prev) => ({ ...prev, date: event.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Seats needed</label>
              <div className="relative">
                <Users className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mute" />
                <Input
                  type="number"
                  min="1"
                  max="8"
                  value={seats}
                  onChange={(event) => setSeats(event.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          <RidePreferencesInput value={preferences} onChange={setPreferences} />
        </div>

        <div className="space-y-3">
          <MapView markers={markers} height="h-80" onMapClick={handleMapClick} />
          <div className="flex items-center gap-2 rounded-xl bg-soft px-4 py-3 text-sm text-muted-foreground">
            <LocateFixed className="h-4 w-4" />
            {mapSelectionTarget
              ? `Click the map to place the ${mapSelectionTarget === 'origin' ? 'pickup' : 'drop-off'}.`
              : 'Use autocomplete or map clicks to help the matcher understand your route.'}
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-soft">
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
          <div className="grid grid-cols-1 gap-4 border-t border-border px-4 py-4 md:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Price range (NOK)</label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  min="0"
                  placeholder="Min"
                  value={filters.minPrice}
                  onChange={(event) => setFilters((prev) => ({ ...prev, minPrice: event.target.value }))}
                  className="bg-softer"
                />
                <Input
                  type="number"
                  min="0"
                  placeholder="Max"
                  value={filters.maxPrice}
                  onChange={(event) => setFilters((prev) => ({ ...prev, maxPrice: event.target.value }))}
                  className="bg-softer"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Departure window</label>
              <div className="grid grid-cols-1 gap-2">
                <Input
                  type="datetime-local"
                  value={filters.earliestDepartureTime}
                  onChange={(event) => setFilters((prev) => ({ ...prev, earliestDepartureTime: event.target.value }))}
                  className="bg-softer"
                />
                <Input
                  type="datetime-local"
                  value={filters.latestDepartureTime}
                  onChange={(event) => setFilters((prev) => ({ ...prev, latestDepartureTime: event.target.value }))}
                  className="bg-softer"
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
                    sortBy: event.target.value as 'bestMatch' | 'departureTime' | 'price' | 'rating',
                  }))
                }
                className="flex h-12 w-full rounded-md border-0 bg-softer px-4 py-4 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="bestMatch">Best match</option>
                <option value="departureTime">Departure time</option>
                <option value="price">Price (low to high)</option>
                <option value="rating">Driver rating</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-24 animate-pulse rounded-xl bg-soft" />
          ))}
        </div>
      ) : visibleRides.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <MapPin className="mx-auto mb-3 h-10 w-10 text-mute" />
          <p className="text-muted-foreground">No rides found. Try another date or location.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleRides.map((ride) => (
            <RideCard key={ride.id} ride={ride} />
          ))}
        </div>
      )}
    </div>
  )
}
