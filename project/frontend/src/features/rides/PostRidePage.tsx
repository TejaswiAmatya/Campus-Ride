import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Car, LocateFixed, Map, Timer } from 'lucide-react'
import { MapView } from '@/components/MapView'
import { usePostRide } from './hooks'
import { RouteInputForm, type RouteInputValue } from './components/RouteInputForm'
import { SeatSelector } from './components/SeatSelector'
import type { GeocodingSuggestion } from './geocoding'
import { reverseGeocode } from './geocoding'
import {
  fetchRoutePreview,
  formatRouteDistance,
  formatRouteDuration,
  type RoutePreview,
} from './routing'

interface CreateRideForm {
  origin: RouteInputValue
  destination: RouteInputValue
  departureTime: string
  totalSeats: string
  pricePerSeat: string
}

export function PostRidePage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<CreateRideForm>({
    origin: { address: '', lat: null, lng: null },
    destination: { address: '', lat: null, lng: null },
    departureTime: '',
    totalSeats: '3',
    pricePerSeat: '',
  })
  const [mapSelectionTarget, setMapSelectionTarget] = useState<'origin' | 'destination' | null>(null)
  const [mapError, setMapError] = useState<string | null>(null)
  const [routePreview, setRoutePreview] = useState<RoutePreview | null>(null)
  const [routeError, setRouteError] = useState<string | null>(null)
  const [isLoadingRoute, setIsLoadingRoute] = useState(false)
  const postRide = usePostRide()

  const setField = (key: 'departureTime' | 'pricePerSeat') => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }))

  const setLocationField = (segment: 'origin' | 'destination', value: Partial<RouteInputValue>) => {
    setForm((prev) => ({
      ...prev,
      [segment]: {
        ...prev[segment],
        ...value,
      },
    }))
  }

  const handleAddressInput = (segment: 'origin' | 'destination', address: string) => {
    setLocationField(segment, {
      address,
      lat: null,
      lng: null,
    })
    setRoutePreview(null)
  }

  const handleSuggestionSelect = (segment: 'origin' | 'destination', suggestion: GeocodingSuggestion) => {
    setLocationField(segment, {
      address: suggestion.address,
      lat: suggestion.lat,
      lng: suggestion.lng,
    })
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
      setMapError('Could not resolve that map location. Try another point or use address search.')
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (
      form.origin.lat === null ||
      form.origin.lng === null ||
      form.destination.lat === null ||
      form.destination.lng === null
    ) {
      setMapError('Select both origin and destination from autocomplete or by clicking the map.')
      return
    }

    postRide.mutate(
      {
        origin: {
          address: form.origin.address,
          lat: form.origin.lat,
          lng: form.origin.lng,
        },
        destination: {
          address: form.destination.address,
          lat: form.destination.lat,
          lng: form.destination.lng,
        },
        totalSeats: parseInt(form.totalSeats, 10),
        pricePerSeat: parseFloat(form.pricePerSeat),
        departureTime: new Date(form.departureTime).toISOString(),
      },
      {
        onSuccess: (ride) => {
          navigate(`/rides/${ride.id}`)
        },
      },
    )
  }

  const markers = [
    ...(form.origin.lat !== null && form.origin.lng !== null
      ? [
          {
            position: [form.origin.lat, form.origin.lng] as [number, number],
            label: form.origin.address || 'Origin',
            type: 'origin' as const,
          },
        ]
      : []),
    ...(form.destination.lat !== null && form.destination.lng !== null
      ? [
          {
            position: [form.destination.lat, form.destination.lng] as [number, number],
            label: form.destination.address || 'Destination',
            type: 'destination' as const,
          },
        ]
      : []),
  ]

  const mapCenter = useMemo<[number, number]>(() => {
    if (markers.length === 2) {
      return [
        (markers[0].position[0] + markers[1].position[0]) / 2,
        (markers[0].position[1] + markers[1].position[1]) / 2,
      ]
    }

    if (markers.length === 1) {
      return markers[0].position
    }

    return [58.9, 5.71]
  }, [markers])

  useEffect(() => {
    if (
      form.origin.lat === null ||
      form.origin.lng === null ||
      form.destination.lat === null ||
      form.destination.lng === null
    ) {
      setRoutePreview(null)
      setRouteError(null)
      setIsLoadingRoute(false)
      return
    }

    const controller = new AbortController()
    setIsLoadingRoute(true)
    setRouteError(null)

    void fetchRoutePreview(
      [
        { lat: form.origin.lat, lng: form.origin.lng },
        { lat: form.destination.lat, lng: form.destination.lng },
      ],
      controller.signal,
    )
      .then((route) => {
        setRoutePreview(route)
      })
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
  }, [form.destination.lat, form.destination.lng, form.origin.lat, form.origin.lng])

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-2">
        <Car className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Post a Ride</h1>
      </div>

      <div className="space-y-3">
        <MapView
          center={mapCenter}
          markers={markers}
          routePath={routePreview?.geometry ?? []}
          height="h-56"
          onMapClick={handleMapClick}
        />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <LocateFixed className="h-4 w-4" />
          <span>
            {mapSelectionTarget
              ? `Click the map to set the ${mapSelectionTarget}.`
              : 'Search for both places or click the map after choosing Origin or Destination.'}
          </span>
        </div>
        {(isLoadingRoute || routePreview || routeError) && (
          <div className="grid gap-3 rounded-2xl border bg-slate-50 p-4 sm:grid-cols-3">
            <RouteStat
              icon={<Map className="h-4 w-4" />}
              label="Distance"
              value={routePreview ? formatRouteDistance(routePreview.distanceMeters) : isLoadingRoute ? 'Loading...' : 'Unavailable'}
            />
            <RouteStat
              icon={<Timer className="h-4 w-4" />}
              label="Drive time"
              value={routePreview ? formatRouteDuration(routePreview.durationSeconds) : isLoadingRoute ? 'Loading...' : 'Unavailable'}
            />
            <div className="rounded-xl border bg-white px-3 py-3 text-sm text-slate-600">
              {routeError
                ? routeError
                : routePreview
                  ? 'Preview based on the current OSRM driving route between your selected points.'
                  : 'Choose both route points to load a trip preview.'}
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <RouteInputForm
          origin={form.origin}
          destination={form.destination}
          mapSelectionTarget={mapSelectionTarget}
          onAddressInput={handleAddressInput}
          onSelectSuggestion={handleSuggestionSelect}
          onPickFromMap={(segment) =>
            setMapSelectionTarget((current) => (current === segment ? null : segment))
          }
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Departure time</label>
            <input
              type="datetime-local"
              value={form.departureTime}
              onChange={setField('departureTime')}
              required
              className="w-full rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <SeatSelector value={form.totalSeats} onChange={(value) => setForm((prev) => ({ ...prev, totalSeats: value }))} />
          <div>
            <label className="mb-1 block text-sm font-medium">Price per seat (NOK)</label>
            <input
              type="number"
              min="1"
              step="any"
              value={form.pricePerSeat}
              onChange={setField('pricePerSeat')}
              placeholder="80"
              required
              className="w-full rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {(postRide.isError || mapError) && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {mapError ?? 'Failed to post ride. Please check your details and try again.'}
          </p>
        )}

        <button
          type="submit"
          disabled={postRide.isPending}
          className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {postRide.isPending ? 'Posting…' : 'Post ride'}
        </button>
      </form>
    </div>
  )
}

function RouteStat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-white px-3 py-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-2 text-sm font-medium text-slate-900">{value}</p>
    </div>
  )
}
