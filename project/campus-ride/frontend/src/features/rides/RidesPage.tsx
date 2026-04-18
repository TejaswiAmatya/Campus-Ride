import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { MapPin, Clock, Users, Plus } from 'lucide-react'
import { api } from '@/api/client'
import { MapView } from '@/components/MapView'
import { useAuth } from '@/hooks/useAuth'

interface Ride {
  id: string
  originAddress: string
  originLat: number
  originLng: number
  destinationAddress: string
  destinationLat: number
  destinationLng: number
  departureTime: string
  availableSeats: number
  totalSeats: number
  pricePerSeat: string
  status: string
  driver: { id: string; name: string; avatarUrl?: string }
}

interface SearchFilters {
  origin: string
  destination: string
  date: string
  seats: string
}

export function RidesPage() {
  const { user } = useAuth()
  const [filters, setFilters] = useState<SearchFilters>({
    origin: '',
    destination: '',
    date: '',
    seats: '',
  })

  const setFilter = (key: keyof SearchFilters) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFilters((prev) => ({ ...prev, [key]: e.target.value }))

  const { data: rides, isLoading } = useQuery({
    queryKey: ['rides', filters],
    queryFn: async (): Promise<Ride[]> => {
      const params = new URLSearchParams()
      if (filters.origin) params.set('origin', filters.origin)
      if (filters.destination) params.set('destination', filters.destination)
      if (filters.date) params.set('date', filters.date)
      if (filters.seats) params.set('seats', filters.seats)
      const res = await api.get<{ data: Ride[] }>(`/api/rides?${params}`)
      return res.data.data ?? []
    },
  })

  // Build markers for map from search results
  const markers = (rides ?? []).flatMap((r) => [
    { position: [r.originLat, r.originLng] as [number, number], label: `From: ${r.originAddress}` },
    { position: [r.destinationLat, r.destinationLng] as [number, number], label: `To: ${r.destinationAddress}` },
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Find a Ride</h1>
        {user?.role === 'DRIVER' && user.isDriverApproved && (
          <Link
            to="/rides/post"
            className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Post a Ride
          </Link>
        )}
      </div>

      {/* Search filters */}
      <div className="grid grid-cols-1 gap-3 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-4">
        <input
          placeholder="From (origin)"
          value={filters.origin}
          onChange={setFilter('origin')}
          className="rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <input
          placeholder="To (destination)"
          value={filters.destination}
          onChange={setFilter('destination')}
          className="rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <input
          type="date"
          value={filters.date}
          onChange={setFilter('date')}
          className="rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <input
          type="number"
          placeholder="Seats needed"
          min="1"
          value={filters.seats}
          onChange={setFilter('seats')}
          className="rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Map */}
      <MapView markers={markers} height="h-72" />

      {/* Results */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-lg border animate-pulse bg-muted" />
          ))}
        </div>
      ) : (rides ?? []).length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <MapPin className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">No rides found. Try adjusting your search.</p>
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

function RideCard({ ride }: { ride: Ride }) {
  return (
    <div className="flex items-start justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors">
      <div className="space-y-1.5 flex-1 min-w-0 pr-4">
        <div className="flex items-center gap-2 font-medium truncate">
          <MapPin className="h-4 w-4 shrink-0 text-primary" />
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
          <span className="font-medium text-foreground">
            {ride.pricePerSeat} NOK / seat
          </span>
        </div>
        <p className="text-xs text-muted-foreground">Driver: {ride.driver?.name}</p>
      </div>
      <Link
        to={`/rides/${ride.id}`}
        className="shrink-0 rounded-md border border-primary px-3 py-1.5 text-sm text-primary hover:bg-primary/10 transition-colors"
      >
        View
      </Link>
    </div>
  )
}
