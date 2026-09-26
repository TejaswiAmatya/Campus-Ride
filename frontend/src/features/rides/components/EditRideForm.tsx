import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { LocateFixed, MapPin, Timer } from 'lucide-react'
import { MapView } from '@/features/rides/components/MapView'
import { Button } from '@/components/ui/button'
import { RidePreferencesInput } from './RidePreferencesInput'
import { RouteInputForm, type RouteInputValue } from './RouteInputForm'
import { StopsEditor, type StopFormValue } from './StopsEditor'
import { reverseGeocode, type GeocodingSuggestion } from '../lib/geocoding'
import { fetchRoutePreview, formatRouteDistance, formatRouteDuration, serializeRouteGeometry, type RoutePreview } from '../lib/routing'
import type { Ride, UpdateRideDto } from '../types'

function TripMetric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-background p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-mute">
        {icon}
        {label}
      </div>
      <p className="mt-3 text-sm font-medium text-foreground">{value}</p>
    </div>
  )
}

export function EditRideForm({
  ride,
  isOpen,
  isSaving,
  onSubmit,
  onClose,
}: {
  ride: Ride | null
  isOpen: boolean
  isSaving: boolean
  onSubmit: (input: { rideId: string; payload: UpdateRideDto }) => void
  onClose: () => void
}) {
  const [origin, setOrigin] = useState<RouteInputValue>({ address: '', lat: null, lng: null })
  const [destination, setDestination] = useState<RouteInputValue>({ address: '', lat: null, lng: null })
  const [stops, setStops] = useState<StopFormValue[]>([])
  const [departureTime, setDepartureTime] = useState('')
  const [totalSeats, setTotalSeats] = useState('3')
  const [pricePerSeat, setPricePerSeat] = useState('0')
  const [detourFlexibilityKm, setDetourFlexibilityKm] = useState('0')
  const [preferences, setPreferences] = useState<string[]>([])
  const [updateMessage, setUpdateMessage] = useState('')
  const [mapSelectionTarget, setMapSelectionTarget] = useState<'origin' | 'destination' | null>(null)
  const [mapError, setMapError] = useState<string | null>(null)
  const [routePreview, setRoutePreview] = useState<RoutePreview | null>(null)
  const [routeError, setRouteError] = useState<string | null>(null)
  const [isLoadingRoute, setIsLoadingRoute] = useState(false)

  useEffect(() => {
    if (!ride || !isOpen) {
      return
    }

    setOrigin({
      address: ride.originAddress,
      lat: ride.originLat,
      lng: ride.originLng,
    })
    setDestination({
      address: ride.destinationAddress,
      lat: ride.destinationLat,
      lng: ride.destinationLng,
    })
    setStops(
      (ride.stops ?? []).map((stop) => ({
        address: stop.address,
        lat: stop.lat,
        lng: stop.lng,
      })),
    )
    setDepartureTime(new Date(ride.departureTime).toISOString().slice(0, 16))
    setTotalSeats(String(ride.totalSeats))
    setPricePerSeat(ride.pricePerSeat)
    setDetourFlexibilityKm(String(ride.detourFlexibilityKm ?? 0))
    setPreferences(ride.preferences ?? [])
    setUpdateMessage('')
    setMapSelectionTarget(null)
    setMapError(null)
    setRouteError(null)
  }, [isOpen, ride])

  const handleAddressInput = (segment: 'origin' | 'destination', address: string) => {
    if (segment === 'origin') {
      setOrigin({ address, lat: null, lng: null })
    } else {
      setDestination({ address, lat: null, lng: null })
    }
  }

  const handleSuggestionSelect = (segment: 'origin' | 'destination', suggestion: GeocodingSuggestion) => {
    if (segment === 'origin') {
      setOrigin({ address: suggestion.address, lat: suggestion.lat, lng: suggestion.lng })
    } else {
      setDestination({ address: suggestion.address, lat: suggestion.lat, lng: suggestion.lng })
    }
    setMapError(null)
  }

  const handleMapClick = async (position: [number, number]) => {
    if (!mapSelectionTarget) {
      return
    }

    try {
      setMapError(null)
      const suggestion = await reverseGeocode(position[0], position[1])
      handleSuggestionSelect(mapSelectionTarget, suggestion)
      setMapSelectionTarget(null)
    } catch {
      setMapError('Could not resolve that map point. Try another location or use search.')
    }
  }

  const validStops = useMemo(
    () => stops.filter((stop) => stop.address.trim() && stop.lat !== null && stop.lng !== null),
    [stops],
  )

  const routePoints = useMemo(() => {
    const points: Array<{ lat: number; lng: number }> = []
    if (origin.lat !== null && origin.lng !== null) {
      points.push({ lat: origin.lat, lng: origin.lng })
    }
    validStops.forEach((stop) => points.push({ lat: stop.lat!, lng: stop.lng! }))
    if (destination.lat !== null && destination.lng !== null) {
      points.push({ lat: destination.lat, lng: destination.lng })
    }
    return points
  }, [destination.lat, destination.lng, origin.lat, origin.lng, validStops])

  useEffect(() => {
    if (!isOpen || routePoints.length < 2) {
      setRoutePreview(null)
      setRouteError(null)
      setIsLoadingRoute(false)
      return
    }

    const controller = new AbortController()
    setIsLoadingRoute(true)
    setRouteError(null)

    void fetchRoutePreview(routePoints, controller.signal)
      .then((route) => setRoutePreview(route))
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return
        }
        setRoutePreview(null)
        setRouteError(error instanceof Error ? error.message : 'Unable to load route preview.')
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoadingRoute(false)
        }
      })

    return () => controller.abort()
  }, [isOpen, routePoints])

  const markers = [
    ...(origin.lat !== null && origin.lng !== null
      ? [{ position: [origin.lat, origin.lng] as [number, number], label: origin.address, type: 'origin' as const }]
      : []),
    ...validStops.map((stop, index) => ({
      position: [stop.lat!, stop.lng!] as [number, number],
      label: `Stop ${index + 1}: ${stop.address}`,
      type: 'default' as const,
    })),
    ...(destination.lat !== null && destination.lng !== null
      ? [{ position: [destination.lat, destination.lng] as [number, number], label: destination.address, type: 'destination' as const }]
      : []),
  ]

  const mapCenter = useMemo<[number, number]>(() => {
    if (markers.length === 0) {
      return [58.9, 5.71]
    }

    const lat = markers.reduce((sum, marker) => sum + marker.position[0], 0) / markers.length
    const lng = markers.reduce((sum, marker) => sum + marker.position[1], 0) / markers.length
    return [lat, lng]
  }, [markers])

  const confirmedPassengers = ride?.bookings?.filter((booking) => booking.status === 'CONFIRMED').length ?? 0
  const notificationWillBeRequired =
    !!ride &&
    (origin.address !== ride.originAddress ||
      origin.lat !== ride.originLat ||
      origin.lng !== ride.originLng ||
      destination.address !== ride.destinationAddress ||
      destination.lat !== ride.destinationLat ||
      destination.lng !== ride.destinationLng ||
      departureTime !== new Date(ride.departureTime).toISOString().slice(0, 16) ||
      totalSeats !== String(ride.totalSeats) ||
      pricePerSeat !== ride.pricePerSeat ||
      detourFlexibilityKm !== String(ride.detourFlexibilityKm ?? 0) ||
      JSON.stringify(preferences) !== JSON.stringify(ride.preferences ?? []) ||
      JSON.stringify(
        validStops.map((stop) => ({
          address: stop.address,
          lat: stop.lat,
          lng: stop.lng,
        })),
      ) !==
        JSON.stringify(
          (ride.stops ?? []).map((stop) => ({
            address: stop.address,
            lat: stop.lat,
            lng: stop.lng,
          })),
        ))

  if (!isOpen || !ride) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 px-4 py-8" role="dialog" aria-modal="true" aria-labelledby="edit-ride-title">
      <div className="mx-auto max-w-4xl rounded-xl bg-background p-6 shadow-elev-2">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 id="edit-ride-title" className="font-display text-display-sm text-foreground">
              Edit ride
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Update timing, route, stops, pricing, and rider preferences before the trip starts.
            </p>
          </div>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Close
          </Button>
        </div>

        <div className="mt-5 space-y-3">
          <MapView
            center={mapCenter}
            markers={markers}
            routePath={routePreview?.geometry ?? []}
            height="h-72"
            onMapClick={handleMapClick}
          />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <LocateFixed className="h-4 w-4" />
            <span>
              {mapSelectionTarget
                ? `Click the map to set the ${mapSelectionTarget}.`
                : 'Use search or choose Origin / Destination to pick on the map.'}
            </span>
          </div>
          {(isLoadingRoute || routePreview || routeError) && (
            <div className="grid gap-3 rounded-xl bg-soft p-4 sm:grid-cols-3">
              <TripMetric icon={<MapPin className="h-4 w-4" />} label="Distance" value={routePreview ? formatRouteDistance(routePreview.distanceMeters) : isLoadingRoute ? 'Loading...' : 'Unavailable'} />
              <TripMetric icon={<Timer className="h-4 w-4" />} label="Drive time" value={routePreview ? formatRouteDuration(routePreview.durationSeconds) : isLoadingRoute ? 'Loading...' : 'Unavailable'} />
              <div className="rounded-xl bg-background px-4 py-3 text-sm text-muted-foreground">
                {routeError
                  ? routeError
                  : routePreview
                    ? 'Preview reflects the current route through all selected stops.'
                    : 'Route preview updates once at least two route points are selected.'}
              </div>
            </div>
          )}
        </div>

        <form
          className="mt-6 space-y-5"
          onSubmit={(event) => {
            event.preventDefault()

            if (
              origin.lat === null ||
              origin.lng === null ||
              destination.lat === null ||
              destination.lng === null
            ) {
              setMapError('Select both origin and destination before saving.')
              return
            }

            onSubmit({
              rideId: ride.id,
              payload: {
                origin: { address: origin.address, lat: origin.lat, lng: origin.lng },
                destination: {
                  address: destination.address,
                  lat: destination.lat,
                  lng: destination.lng,
                },
                stops: validStops.map((stop, orderIndex) => ({
                  address: stop.address,
                  lat: stop.lat!,
                  lng: stop.lng!,
                  orderIndex,
                })),
                departureTime: new Date(departureTime).toISOString(),
                totalSeats: parseInt(totalSeats, 10),
                pricePerSeat: parseFloat(pricePerSeat),
                detourFlexibilityKm: parseFloat(detourFlexibilityKm || '0'),
                preferences,
                routePolyline: routePreview ? serializeRouteGeometry(routePreview.geometry) : null,
                routeDistanceKm: routePreview ? Number((routePreview.distanceMeters / 1000).toFixed(2)) : null,
                routeDurationMinutes: routePreview ? Math.round(routePreview.durationSeconds / 60) : null,
                updateMessage: updateMessage.trim() || undefined,
              },
            })
          }}
        >
          <RouteInputForm
            origin={origin}
            destination={destination}
            mapSelectionTarget={mapSelectionTarget}
            onAddressInput={handleAddressInput}
            onSelectSuggestion={handleSuggestionSelect}
            onPickFromMap={(segment) => setMapSelectionTarget((current) => (current === segment ? null : segment))}
          />

          <StopsEditor stops={stops} onChange={setStops} />

          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Departure time</label>
              <input
                type="datetime-local"
                value={departureTime}
                onChange={(event) => setDepartureTime(event.target.value)}
                required
                className="flex h-12 w-full rounded-md border-0 bg-soft px-4 py-4 text-base"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Seats</label>
              <input
                type="number"
                min={Math.max(1, confirmedPassengers)}
                max="8"
                step="1"
                value={totalSeats}
                onChange={(event) => setTotalSeats(event.target.value)}
                required
                className="flex h-12 w-full rounded-md border-0 bg-soft px-4 py-4 text-base"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Price per seat</label>
              <input
                type="number"
                min="0"
                step="any"
                value={pricePerSeat}
                onChange={(event) => setPricePerSeat(event.target.value)}
                required
                className="flex h-12 w-full rounded-md border-0 bg-soft px-4 py-4 text-base"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Detour flexibility (km)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={detourFlexibilityKm}
                onChange={(event) => setDetourFlexibilityKm(event.target.value)}
                className="flex h-12 w-full rounded-md border-0 bg-soft px-4 py-4 text-base"
              />
            </div>
          </div>

          <RidePreferencesInput value={preferences} onChange={setPreferences} />

          {confirmedPassengers > 0 && (
            <div className="rounded-xl bg-soft px-4 py-4 text-sm text-foreground">
              <p className="font-medium">
                {confirmedPassengers} confirmed passenger{confirmedPassengers === 1 ? '' : 's'} on this ride.
              </p>
              <p className="mt-1 text-muted-foreground">
                We only notify passengers when a confirmed ride actually changes. Add a short note if you want to explain what changed.
              </p>
              <textarea
                value={updateMessage}
                onChange={(event) => setUpdateMessage(event.target.value)}
                rows={3}
                placeholder="Optional note to passengers about the update"
                className="mt-3 flex h-12 w-full rounded-md border-0 bg-softer px-4 py-4 text-base"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                {notificationWillBeRequired
                  ? 'This edit changes a confirmed ride, so passengers will be notified.'
                  : 'No passenger notification will be sent unless the route, timing, seats, or pricing changes.'}
              </p>
            </div>
          )}

          {(mapError || routeError) && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {mapError ?? routeError}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
