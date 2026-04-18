import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { MapPin, Car } from 'lucide-react'
import { api } from '@/api/client'
import { MapView } from '@/components/MapView'

interface CreateRideForm {
  originAddress: string
  originLat: string
  originLng: string
  destinationAddress: string
  destinationLat: string
  destinationLng: string
  departureTime: string
  totalSeats: string
  pricePerSeat: string
}

export function PostRidePage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<CreateRideForm>({
    originAddress: '',
    originLat: '',
    originLng: '',
    destinationAddress: '',
    destinationLat: '',
    destinationLng: '',
    departureTime: '',
    totalSeats: '3',
    pricePerSeat: '',
  })

  const set = (key: keyof CreateRideForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }))

  const createRideMutation = useMutation({
    mutationFn: async (data: CreateRideForm) => {
      const res = await api.post('/api/rides', {
        ...data,
        originLat: parseFloat(data.originLat),
        originLng: parseFloat(data.originLng),
        destinationLat: parseFloat(data.destinationLat),
        destinationLng: parseFloat(data.destinationLng),
        totalSeats: parseInt(data.totalSeats, 10),
        pricePerSeat: parseFloat(data.pricePerSeat),
        departureTime: new Date(data.departureTime).toISOString(),
      })
      return res.data
    },
    onSuccess: () => {
      navigate('/rides')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createRideMutation.mutate(form)
  }

  // TODO (Sprint 2): replace manual lat/lng inputs with a Nominatim geocoder +
  // map click handler so drivers pick locations visually on the map.
  const originMarkers =
    form.originLat && form.originLng
      ? [{ position: [parseFloat(form.originLat), parseFloat(form.originLng)] as [number, number], label: 'Origin' }]
      : []

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-2">
        <Car className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Post a Ride</h1>
      </div>

      {/* Map preview */}
      <MapView markers={originMarkers} height="h-48" />

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Origin */}
        <fieldset className="space-y-3 rounded-lg border p-4">
          <legend className="px-1 text-sm font-medium flex items-center gap-1">
            <MapPin className="h-4 w-4 text-green-600" /> Origin
          </legend>
          <input
            placeholder="Origin address"
            value={form.originAddress}
            onChange={set('originAddress')}
            required
            className="w-full rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="Latitude (e.g. 58.9)"
              type="number"
              step="any"
              value={form.originLat}
              onChange={set('originLat')}
              required
              className="rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              placeholder="Longitude (e.g. 5.71)"
              type="number"
              step="any"
              value={form.originLng}
              onChange={set('originLng')}
              required
              className="rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </fieldset>

        {/* Destination */}
        <fieldset className="space-y-3 rounded-lg border p-4">
          <legend className="px-1 text-sm font-medium flex items-center gap-1">
            <MapPin className="h-4 w-4 text-red-500" /> Destination
          </legend>
          <input
            placeholder="Destination address"
            value={form.destinationAddress}
            onChange={set('destinationAddress')}
            required
            className="w-full rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="Latitude"
              type="number"
              step="any"
              value={form.destinationLat}
              onChange={set('destinationLat')}
              required
              className="rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              placeholder="Longitude"
              type="number"
              step="any"
              value={form.destinationLng}
              onChange={set('destinationLng')}
              required
              className="rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </fieldset>

        {/* Ride details */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium mb-1">Departure time</label>
            <input
              type="datetime-local"
              value={form.departureTime}
              onChange={set('departureTime')}
              required
              className="w-full rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Available seats</label>
            <input
              type="number"
              min="1"
              max="8"
              value={form.totalSeats}
              onChange={set('totalSeats')}
              required
              className="w-full rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Price per seat (NOK)</label>
            <input
              type="number"
              min="1"
              step="any"
              value={form.pricePerSeat}
              onChange={set('pricePerSeat')}
              placeholder="80"
              required
              className="w-full rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {createRideMutation.isError && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Failed to post ride. Please check your details and try again.
          </p>
        )}

        <button
          type="submit"
          disabled={createRideMutation.isPending}
          className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {createRideMutation.isPending ? 'Posting…' : 'Post ride'}
        </button>
      </form>
    </div>
  )
}
