import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Car } from 'lucide-react'
import { MapView } from '@/components/MapView'
import { usePostRide } from './hooks'
import { RouteInputForm } from './components/RouteInputForm'
import { SeatSelector } from './components/SeatSelector'

interface LocationFormValue {
  address: string
  lat: string
  lng: string
}

interface CreateRideForm {
  origin: LocationFormValue
  destination: LocationFormValue
  departureTime: string
  totalSeats: string
  pricePerSeat: string
}

export function PostRidePage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<CreateRideForm>({
    origin: { address: '', lat: '', lng: '' },
    destination: { address: '', lat: '', lng: '' },
    departureTime: '',
    totalSeats: '3',
    pricePerSeat: '',
  })
  const postRide = usePostRide()

  const setField = (key: 'departureTime' | 'pricePerSeat') => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }))

  const setLocationField = (
    segment: 'origin' | 'destination',
    field: keyof LocationFormValue,
    value: string,
  ) => {
    setForm((prev) => ({
      ...prev,
      [segment]: {
        ...prev[segment],
        [field]: value,
      },
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    postRide.mutate(
      {
        origin: {
          address: form.origin.address,
          lat: parseFloat(form.origin.lat),
          lng: parseFloat(form.origin.lng),
        },
        destination: {
          address: form.destination.address,
          lat: parseFloat(form.destination.lat),
          lng: parseFloat(form.destination.lng),
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

  // TODO (Sprint 2): replace manual lat/lng inputs with a Nominatim geocoder +
  // map click handler so drivers pick locations visually on the map.
  const markers = [
    ...(form.origin.lat && form.origin.lng
      ? [
          {
            position: [parseFloat(form.origin.lat), parseFloat(form.origin.lng)] as [number, number],
            label: form.origin.address || 'Origin',
            type: 'origin' as const,
          },
        ]
      : []),
    ...(form.destination.lat && form.destination.lng
      ? [
          {
            position: [parseFloat(form.destination.lat), parseFloat(form.destination.lng)] as [number, number],
            label: form.destination.address || 'Destination',
            type: 'destination' as const,
          },
        ]
      : []),
  ]

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-2">
        <Car className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Post a Ride</h1>
      </div>

      {/* Map preview */}
      <MapView markers={markers} height="h-48" />

      <form onSubmit={handleSubmit} className="space-y-5">
        <RouteInputForm
          origin={form.origin}
          destination={form.destination}
          onChange={setLocationField}
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

        {postRide.isError && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Failed to post ride. Please check your details and try again.
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
