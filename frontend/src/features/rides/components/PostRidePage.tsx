import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Car, LocateFixed, Map, Repeat, Route, Timer } from 'lucide-react'
import { extractApiError } from '@/api/client'
import { MapView } from '@/features/rides/components/MapView'
import { usePostRide } from '../hooks/useRides'
import { RidePreferencesInput } from './RidePreferencesInput'
import { RouteInputForm, type RouteInputValue } from './RouteInputForm'
import { SeatSelector } from './SeatSelector'
import { StopsEditor, type StopFormValue } from './StopsEditor'
import type { GeocodingSuggestion } from '../lib/geocoding'
import { reverseGeocode } from '../lib/geocoding'
import {
  fetchRoutePreview,
  formatRouteDistance,
  formatRouteDuration,
  serializeRouteGeometry,
  type RoutePreview,
} from '../lib/routing'
import type { RideRecurrencePattern } from '../types'

interface CreateRideForm {
  offerType: 'ONE_TIME' | 'RECURRING'
  origin: RouteInputValue
  destination: RouteInputValue
  stops: StopFormValue[]
  departureTime: string
  recurrencePattern: RideRecurrencePattern
  recurrenceDays: number[]
  recurrenceEndDate: string
  totalSeats: string
  pricePerSeat: string
  detourFlexibilityKm: string
  preferences: string[]
}

const weekdayOptions = [
  { label: 'Sun', value: 0 },
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
]

export function PostRidePage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<CreateRideForm>({
    offerType: 'ONE_TIME',
    origin: { address: '', lat: null, lng: null },
    destination: { address: '', lat: null, lng: null },
    stops: [],
    departureTime: '',
    recurrencePattern: 'WEEKLY',
    recurrenceDays: [],
    recurrenceEndDate: '',
    totalSeats: '3',
    pricePerSeat: '50',
    detourFlexibilityKm: '0',
    preferences: [],
  })
  const [mapSelectionTarget, setMapSelectionTarget] = useState<'origin' | 'destination' | null>(null)
  const [mapError, setMapError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [routePreview, setRoutePreview] = useState<RoutePreview | null>(null)
  const [routeError, setRouteError] = useState<string | null>(null)
  const [isLoadingRoute, setIsLoadingRoute] = useState(false)
  const postRide = usePostRide()
  const postRideError = postRide.isError
    ? extractApiError(postRide.error, 'Failed to post ride. Please check your details and try again.').message
    : null

  const setField =
    (key: 'departureTime' | 'pricePerSeat' | 'detourFlexibilityKm') =>
    (event: React.ChangeEvent<HTMLInputElement>) =>
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
    setSubmitError(null)
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

  const validStops = form.stops.filter((stop) => stop.address.trim() && stop.lat !== null && stop.lng !== null)

  const routePoints = useMemo(() => {
    const points: Array<{ lat: number; lng: number }> = []
    if (form.origin.lat !== null && form.origin.lng !== null) {
      points.push({ lat: form.origin.lat, lng: form.origin.lng })
    }
    validStops.forEach((stop) => {
      points.push({ lat: stop.lat!, lng: stop.lng! })
    })
    if (form.destination.lat !== null && form.destination.lng !== null) {
      points.push({ lat: form.destination.lat, lng: form.destination.lng })
    }
    return points
  }, [form.destination.lat, form.destination.lng, form.origin.lat, form.origin.lng, validStops])

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
    ...validStops.map((stop, index) => ({
      position: [stop.lat!, stop.lng!] as [number, number],
      label: `Stop ${index + 1}: ${stop.address}`,
      type: 'default' as const,
    })),
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
    if (markers.length > 0) {
      const lat = markers.reduce((sum, marker) => sum + marker.position[0], 0) / markers.length
      const lng = markers.reduce((sum, marker) => sum + marker.position[1], 0) / markers.length
      return [lat, lng]
    }

    return [58.9, 5.71]
  }, [markers])

  useEffect(() => {
    if (routePoints.length < 2) {
      setRoutePreview(null)
      setRouteError(null)
      setIsLoadingRoute(false)
      return
    }

    const controller = new AbortController()
    setIsLoadingRoute(true)
    setRouteError(null)

    void fetchRoutePreview(routePoints, controller.signal)
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
  }, [routePoints])

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setSubmitError(null)

    if (
      form.origin.lat === null ||
      form.origin.lng === null ||
      form.destination.lat === null ||
      form.destination.lng === null
    ) {
      setMapError('Select both origin and destination from autocomplete or by clicking the map.')
      return
    }

    if (form.offerType === 'RECURRING' && form.recurrencePattern === 'SPECIFIC_DAYS' && form.recurrenceDays.length === 0) {
      setMapError('Choose at least one weekday for a recurring ride.')
      return
    }

    const parsedDepartureTime = new Date(form.departureTime)
    if (Number.isNaN(parsedDepartureTime.getTime())) {
      setMapError('Choose a valid departure time before posting the ride.')
      return
    }

    postRide.mutate(
      {
        offerType: form.offerType,
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
        stops: validStops.map((stop, orderIndex) => ({
          address: stop.address,
          lat: stop.lat!,
          lng: stop.lng!,
          orderIndex,
        })),
        totalSeats: parseInt(form.totalSeats, 10),
        pricePerSeat: parseFloat(form.pricePerSeat),
        departureTime: parsedDepartureTime.toISOString(),
        detourFlexibilityKm: parseFloat(form.detourFlexibilityKm || '0'),
        preferences: form.preferences,
        recurrencePattern: form.offerType === 'RECURRING' ? form.recurrencePattern : 'NONE',
        recurrenceDays: form.offerType === 'RECURRING' ? form.recurrenceDays : [],
        recurrenceEndDate:
          form.offerType === 'RECURRING' && form.recurrenceEndDate
            ? new Date(form.recurrenceEndDate).toISOString()
            : null,
        routePolyline: routePreview ? serializeRouteGeometry(routePreview.geometry) : null,
        routeDistanceKm: routePreview ? Number((routePreview.distanceMeters / 1000).toFixed(2)) : null,
        routeDurationMinutes: routePreview ? Math.round(routePreview.durationSeconds / 60) : null,
      },
      {
        onSuccess: (ride) => {
          navigate(`/rides/${ride.id}`)
        },
        onError: (error) => {
          if (axios.isAxiosError<{ error?: { message?: string } }>(error)) {
            setSubmitError(
              error.response?.data?.error?.message ?? 'Failed to post ride. Please check your details and try again.',
            )
            return
          }

          setSubmitError('Failed to post ride. Please check your details and try again.')
        },
      },
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center gap-2">
        <Car className="h-6 w-6 text-foreground" />
        <h1 className="font-display text-display-lg">Post a Ride</h1>
      </div>

      <div className="space-y-3">
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
              : 'Search for both places or click the map after choosing Origin or Destination.'}
          </span>
        </div>
        {(isLoadingRoute || routePreview || routeError) && (
          <div className="grid gap-3 rounded-xl bg-soft p-4 sm:grid-cols-3">
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
            <div className="rounded-xl bg-background px-3 py-3 text-sm text-muted-foreground">
              {routeError
                ? routeError
                : routePreview
                  ? 'Preview based on the current OSRM driving route across all selected stops.'
                  : 'Choose route points to load a trip preview.'}
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-xl bg-soft p-4">
          <div className="flex flex-wrap gap-2">
            {(['ONE_TIME', 'RECURRING'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, offerType: option }))}
                className={`rounded-pill px-3 py-1.5 text-sm font-medium transition ${form.offerType === option ? 'bg-primary text-foreground-foreground' : 'bg-background hover:bg-border'}`}
              >
                {option === 'ONE_TIME' ? 'One-time ride' : 'Recurring ride'}
              </button>
            ))}
          </div>
        </div>

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

        <StopsEditor
          stops={form.stops}
          onChange={(stops) => setForm((prev) => ({ ...prev, stops }))}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Departure time</label>
            <input
              type="datetime-local"
              value={form.departureTime}
              onChange={setField('departureTime')}
              required
              className="flex h-12 w-full rounded-md border-0 bg-soft px-4 py-4 text-base"
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
              placeholder="50"
              required
              className="flex h-12 w-full rounded-md border-0 bg-soft px-4 py-4 text-base"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Driver detour flexibility (km)</label>
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              value={form.detourFlexibilityKm}
              onChange={setField('detourFlexibilityKm')}
              className="flex h-12 w-full rounded-md border-0 bg-soft px-4 py-4 text-base"
            />
          </div>

          {form.offerType === 'RECURRING' && (
            <div className="rounded-xl bg-soft p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                <Repeat className="h-4 w-4" />
                Recurrence
              </div>
              <select
                value={form.recurrencePattern}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    recurrencePattern: event.target.value as RideRecurrencePattern,
                  }))
                }
                className="flex h-12 w-full rounded-md border-0 bg-soft px-4 py-4 text-base"
              >
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="SPECIFIC_DAYS">Specific days</option>
              </select>
              {form.recurrencePattern === 'SPECIFIC_DAYS' && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {weekdayOptions.map((day) => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          recurrenceDays: prev.recurrenceDays.includes(day.value)
                            ? prev.recurrenceDays.filter((value) => value !== day.value)
                            : [...prev.recurrenceDays, day.value].sort((a, b) => a - b),
                        }))
                      }
                      className={`rounded-pill px-3 py-1 text-sm font-medium ${form.recurrenceDays.includes(day.value) ? 'bg-primary text-foreground-foreground' : 'bg-background hover:bg-border'}`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-3">
                <label className="mb-1 block text-sm font-medium">Repeat until</label>
                <input
                  type="date"
                  value={form.recurrenceEndDate}
                  onChange={(event) => setForm((prev) => ({ ...prev, recurrenceEndDate: event.target.value }))}
                  className="flex h-12 w-full rounded-md border-0 bg-soft px-4 py-4 text-base"
                />
              </div>
            </div>
          )}
        </div>

        <RidePreferencesInput
          value={form.preferences}
          onChange={(preferences) => setForm((prev) => ({ ...prev, preferences }))}
        />

        {(postRide.isError || mapError || submitError) && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {mapError ?? submitError ?? 'Failed to post ride. Please check your details and try again.'}
            {mapError ?? postRideError ?? 'Failed to post ride. Please check your details and try again.'}
          </p>
        )}

        <button
          type="submit"
          disabled={postRide.isPending}
          className="w-full rounded-pill bg-primary px-4 py-3 text-base font-medium text-foreground-foreground transition-colors hover:bg-elevated disabled:opacity-50"
        >
          {postRide.isPending ? 'Posting…' : form.offerType === 'RECURRING' ? 'Create recurring ride offer' : 'Post ride'}
        </button>
      </form>
    </div>
  )
}

function RouteStat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-background px-3 py-3">
      <div className="flex items-center gap-2 text-xs font-medium text-mute">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-2 text-sm font-medium text-foreground">{value}</p>
    </div>
  )
}
