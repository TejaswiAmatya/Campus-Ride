import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LocateFixed, Car } from 'lucide-react'
import { MapView } from '@/components/MapView'
import { usePostRide } from './hooks'
import { RouteInputForm, type RouteInputValue } from './components/RouteInputForm'
import { SeatSelector } from './components/SeatSelector'
import type { GeocodingSuggestion } from './geocoding'
import { reverseGeocode } from './geocoding'

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

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-2">
        <Car className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Post a Ride</h1>
      </div>

      <div className="space-y-2">
        <MapView
          center={mapCenter}
          markers={markers}
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

        {/* Ride details */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium mb-1">Departure time</label>
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
            <label className="block text-sm font-medium mb-1">Price per seat (NOK)</label>
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
          className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {postRide.isPending ? 'Posting…' : 'Post ride'}
        </button>
      </form>
    </div>
  )
}
