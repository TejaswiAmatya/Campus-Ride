import { Link } from 'react-router-dom'
import { CarFront, Clock3, MapPin, Plus, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { useMyRides, useUpdateRideStatus } from './hooks'
import type { Ride, RideStatusUpdate } from './types'

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
                      <span className="font-medium text-foreground">{ride.pricePerSeat} NOK / seat</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:justify-end">
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
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
