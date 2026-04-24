import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CarFront, ChevronDown, ChevronUp, Clock3, MapPin, Plus, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuth } from '@/hooks/useAuth'
import { useMyRides, useUpdateRideStatus } from './hooks'
import type { Ride, RideBooking, RideStatusUpdate } from './types'

const statusLabels: Record<Ride['status'], string> = {
  OPEN: 'Scheduled',
  FULL: 'Scheduled',
  IN_PROGRESS: 'Active',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

const statusVariants: Record<Ride['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
  OPEN: 'secondary',
  FULL: 'secondary',
  IN_PROGRESS: 'default',
  COMPLETED: 'outline',
  CANCELLED: 'destructive',
}

const bookingStatusLabels: Record<RideBooking['status'], string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  CANCELLED: 'Cancelled',
  COMPLETED: 'Completed',
}

const bookingStatusVariants: Record<RideBooking['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PENDING: 'secondary',
  CONFIRMED: 'default',
  CANCELLED: 'destructive',
  COMPLETED: 'outline',
}

function availableActions(status: Ride['status']) {
  if (status === 'OPEN' || status === 'FULL') {
    return ['ACTIVE', 'CANCELLED'] as const
  }

  if (status === 'IN_PROGRESS') {
    return ['COMPLETED'] as const
  }

  return [] as const
}

function actionLabel(status: RideStatusUpdate) {
  if (status === 'ACTIVE') return 'Start Ride'
  if (status === 'COMPLETED') return 'Complete Ride'
  return 'Cancel'
}

function actionVariant(status: RideStatusUpdate): 'default' | 'outline' | 'destructive' {
  if (status === 'CANCELLED') return 'destructive'
  if (status === 'COMPLETED') return 'outline'
  return 'default'
}

export function MyRidesPage() {
  const { user } = useAuth()
  const { data: rides, isLoading } = useMyRides()
  const updateRideStatus = useUpdateRideStatus()
  const [expandedRideId, setExpandedRideId] = useState<string | null>(null)

  if (!user || user.role !== 'DRIVER') {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
        This page is only available to drivers.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Rides</h1>
          <p className="text-sm text-muted-foreground">Manage your scheduled, active, and completed rides.</p>
        </div>
        <Button asChild>
          <Link to="/rides/post">
            <Plus className="mr-2 h-4 w-4" />
            Post a Ride
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-32 animate-pulse rounded-lg border bg-muted" />
          ))}
        </div>
      ) : (rides ?? []).length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <CarFront className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-muted-foreground">You have not posted any rides yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {(rides ?? []).map((ride) => {
            const actions = availableActions(ride.status)
            const bookings = ride.bookings ?? []
            const isExpanded = expandedRideId === ride.id

            return (
              <div key={ride.id} className="rounded-xl border p-4 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={statusVariants[ride.status]}>{statusLabels[ride.status]}</Badge>
                      <span className="text-sm font-medium text-muted-foreground">Ride #{ride.id.slice(0, 8)}</span>
                    </div>

                    <div className="flex items-start gap-2 text-base font-medium">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>
                        {ride.originAddress} → {ride.destinationAddress}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock3 className="h-4 w-4" />
                        {new Date(ride.departureTime).toLocaleString('en-GB', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {ride.availableSeats} / {ride.totalSeats} seats left
                      </span>
                      <span>{ride._count?.bookings ?? bookings.length} booking requests</span>
                      <span className="font-medium text-foreground">{ride.pricePerSeat} NOK / seat</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setExpandedRideId((current) => (current === ride.id ? null : ride.id))}
                    >
                      {isExpanded ? <ChevronUp className="mr-2 h-4 w-4" /> : <ChevronDown className="mr-2 h-4 w-4" />}
                      {isExpanded ? 'Hide Requests' : 'View Requests'}
                    </Button>
                    {actions.map((status) => (
                      <Button
                        key={status}
                        variant={actionVariant(status)}
                        disabled={updateRideStatus.isPending}
                        onClick={() => updateRideStatus.mutate({ rideId: ride.id, status })}
                      >
                        {actionLabel(status)}
                      </Button>
                    ))}
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-4 rounded-lg border bg-muted/20">
                    <div className="border-b px-4 py-3">
                      <h2 className="text-sm font-semibold">Booking Requests</h2>
                    </div>
                    {bookings.length === 0 ? (
                      <p className="px-4 py-6 text-sm text-muted-foreground">No booking requests yet.</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Passenger</TableHead>
                            <TableHead>Seats</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {bookings.map((booking) => (
                            <TableRow key={booking.id}>
                              <TableCell className="font-medium">{booking.passenger.name}</TableCell>
                              <TableCell>{booking.seatsBooked}</TableCell>
                              <TableCell>
                                <Badge variant={bookingStatusVariants[booking.status]}>
                                  {bookingStatusLabels[booking.status]}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
