import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CarFront, ChevronDown, ChevronUp, Clock3, MapPin, Plus, UserCheck, UserRoundX, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useMarkBookingNoShow, useMarkBookingPickedUp } from '@/features/bookings/hooks'
import { useAuth } from '@/hooks/useAuth'
import { useCancelRide, useDriverLocationEmitter, useMyRides, useUpdateRideStatus } from './hooks'
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
    return ['ACTIVE'] as const
  }

  if (status === 'IN_PROGRESS') {
    return ['COMPLETED'] as const
  }

  return [] as const
}

function actionLabel(status: RideStatusUpdate) {
  if (status === 'ACTIVE') return 'Start Ride'
  if (status === 'COMPLETED') return 'Complete Ride'
  return 'Cancel Ride'
}

function actionVariant(status: RideStatusUpdate): 'default' | 'outline' | 'destructive' {
  if (status === 'CANCELLED') return 'destructive'
  if (status === 'COMPLETED') return 'outline'
  return 'default'
}

interface MyRideCardProps {
  ride: Ride
  isExpanded: boolean
  isUpdatingStatus: boolean
  isCancellingRide: boolean
  locallyPickedUpBookingIds: Set<string>
  locallyNoShowBookingIds: Set<string>
  onToggleExpanded: () => void
  onUpdateStatus: (status: RideStatusUpdate) => void
  onRequestCancel: () => void
  onMarkPickedUp: (bookingId: string) => void
  onMarkNoShow: (bookingId: string) => void
  pickupPendingBookingId: string | null
  noShowPendingBookingId: string | null
}

function MyRideCard({
  ride,
  isExpanded,
  isUpdatingStatus,
  isCancellingRide,
  locallyPickedUpBookingIds,
  locallyNoShowBookingIds,
  onToggleExpanded,
  onUpdateStatus,
  onRequestCancel,
  onMarkPickedUp,
  onMarkNoShow,
  pickupPendingBookingId,
  noShowPendingBookingId,
}: MyRideCardProps) {
  const actions = availableActions(ride.status)
  const bookings = ride.bookings ?? []
  const confirmedBookings = bookings.filter((booking) => booking.status === 'CONFIRMED')
  const { isSharingLocation } = useDriverLocationEmitter(ride.status === 'IN_PROGRESS' ? ride.id : undefined)
  const canCancelRide = ride.status === 'OPEN' || ride.status === 'FULL'
  const canManagePassengers = ride.status === 'IN_PROGRESS' && confirmedBookings.length > 0

  return (
    <div className="rounded-xl border p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariants[ride.status]}>{statusLabels[ride.status]}</Badge>
            {isSharingLocation && (
              <Badge variant="secondary" className="gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
                Sharing location
              </Badge>
            )}
            <span className="text-sm font-medium text-muted-foreground">Ride #{ride.id.slice(0, 8)}</span>
          </div>

          <div className="flex items-start gap-2 text-base font-medium">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              {ride.originAddress} to {ride.destinationAddress}
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
          <Button variant="outline" onClick={onToggleExpanded}>
            {isExpanded ? <ChevronUp className="mr-2 h-4 w-4" /> : <ChevronDown className="mr-2 h-4 w-4" />}
            {isExpanded ? 'Hide Requests' : 'View Requests'}
          </Button>
          {actions.map((status) => (
            <Button key={status} variant={actionVariant(status)} disabled={isUpdatingStatus} onClick={() => onUpdateStatus(status)}>
              {actionLabel(status)}
            </Button>
          ))}
          {canCancelRide && (
            <Button variant="destructive" disabled={isCancellingRide} onClick={onRequestCancel}>
              {isCancellingRide ? 'Cancelling...' : 'Cancel Ride'}
            </Button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 rounded-lg border bg-muted/20">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-semibold">
              {canManagePassengers ? 'Passenger handling' : 'Booking Requests'}
            </h2>
            {canManagePassengers && (
              <p className="mt-1 text-xs text-muted-foreground">
                Mark each confirmed passenger as picked up or no-show while the ride is active.
              </p>
            )}
          </div>
          {bookings.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">No booking requests yet.</p>
          ) : ride.status === 'IN_PROGRESS' && confirmedBookings.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              No confirmed passengers are available to mark for this active ride.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Passenger</TableHead>
                  <TableHead>Seats</TableHead>
                  <TableHead>Status</TableHead>
                  {canManagePassengers && <TableHead>Ride actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(canManagePassengers ? confirmedBookings : bookings).map((booking) => {
                  const pickedUpLocally = locallyPickedUpBookingIds.has(booking.id)
                  const noShowLocally = locallyNoShowBookingIds.has(booking.id)
                  const canHandleThisBooking =
                    canManagePassengers &&
                    !pickedUpLocally &&
                    !noShowLocally

                  return (
                    <TableRow key={booking.id}>
                      <TableCell className="font-medium">{booking.passenger.name}</TableCell>
                      <TableCell>{booking.seatsBooked}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={bookingStatusVariants[booking.status]}>{bookingStatusLabels[booking.status]}</Badge>
                          {pickedUpLocally && <span className="text-xs text-emerald-700">Picked up</span>}
                          {noShowLocally && <span className="text-xs text-destructive">Marked no-show</span>}
                        </div>
                      </TableCell>
                      {canManagePassengers && (
                        <TableCell>
                          {canHandleThisBooking ? (
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={pickupPendingBookingId === booking.id || noShowPendingBookingId === booking.id}
                                onClick={() => onMarkPickedUp(booking.id)}
                              >
                                <UserCheck className="mr-2 h-4 w-4" />
                                {pickupPendingBookingId === booking.id ? 'Saving...' : 'Picked up'}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={pickupPendingBookingId === booking.id || noShowPendingBookingId === booking.id}
                                onClick={() => onMarkNoShow(booking.id)}
                              >
                                <UserRoundX className="mr-2 h-4 w-4" />
                                {noShowPendingBookingId === booking.id ? 'Saving...' : 'No-show'}
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {pickedUpLocally
                                ? 'Passenger marked as picked up.'
                                : noShowLocally
                                  ? 'Passenger marked as no-show.'
                                  : 'Already handled.'}
                            </span>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </div>
      )}
    </div>
  )
}

function CancelRideDialog({
  ride,
  isOpen,
  isCancelling,
  onConfirm,
  onClose,
}: {
  ride: Ride | null
  isOpen: boolean
  isCancelling: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  if (!isOpen || !ride) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" role="dialog" aria-modal="true" aria-labelledby="cancel-ride-title">
      <div className="w-full max-w-md rounded-xl border bg-background p-6 shadow-xl">
        <div className="space-y-2">
          <h2 id="cancel-ride-title" className="text-lg font-semibold">
            Cancel this ride?
          </h2>
          <p className="text-sm text-muted-foreground">
            {ride.originAddress} to {ride.destinationAddress}
          </p>
          <p className="text-sm text-muted-foreground">
            Any confirmed passenger bookings will be cancelled and their seats will be restored automatically.
          </p>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" disabled={isCancelling} onClick={onClose}>
            Keep Ride
          </Button>
          <Button variant="destructive" disabled={isCancelling} onClick={onConfirm}>
            {isCancelling ? 'Cancelling...' : 'Confirm Cancel'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export function MyRidesPage() {
  const { user } = useAuth()
  const { data: rides, isLoading } = useMyRides()
  const updateRideStatus = useUpdateRideStatus()
  const cancelRide = useCancelRide()
  const markBookingPickedUp = useMarkBookingPickedUp()
  const markBookingNoShow = useMarkBookingNoShow()
  const [expandedRideId, setExpandedRideId] = useState<string | null>(null)
  const [rideToCancel, setRideToCancel] = useState<Ride | null>(null)
  const [locallyPickedUpBookingIds, setLocallyPickedUpBookingIds] = useState<string[]>([])
  const [locallyNoShowBookingIds, setLocallyNoShowBookingIds] = useState<string[]>([])

  const pickedUpSet = useMemo(() => new Set(locallyPickedUpBookingIds), [locallyPickedUpBookingIds])
  const noShowSet = useMemo(() => new Set(locallyNoShowBookingIds), [locallyNoShowBookingIds])

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
            return (
              <MyRideCard
                key={ride.id}
                ride={ride}
                isExpanded={expandedRideId === ride.id}
                isUpdatingStatus={updateRideStatus.isPending}
                isCancellingRide={cancelRide.isPending && rideToCancel?.id === ride.id}
                locallyPickedUpBookingIds={pickedUpSet}
                locallyNoShowBookingIds={noShowSet}
                onToggleExpanded={() => setExpandedRideId((current) => (current === ride.id ? null : ride.id))}
                onUpdateStatus={(status) => updateRideStatus.mutate({ rideId: ride.id, status })}
                onRequestCancel={() => setRideToCancel(ride)}
                onMarkPickedUp={(bookingId) =>
                  markBookingPickedUp.mutate(bookingId, {
                    onSuccess: () =>
                      setLocallyPickedUpBookingIds((current) =>
                        current.includes(bookingId) ? current : [...current, bookingId],
                      ),
                  })
                }
                onMarkNoShow={(bookingId) =>
                  markBookingNoShow.mutate(bookingId, {
                    onSuccess: () =>
                      setLocallyNoShowBookingIds((current) =>
                        current.includes(bookingId) ? current : [...current, bookingId],
                      ),
                  })
                }
                pickupPendingBookingId={markBookingPickedUp.isPending ? markBookingPickedUp.variables ?? null : null}
                noShowPendingBookingId={markBookingNoShow.isPending ? markBookingNoShow.variables ?? null : null}
              />
            )
          })}
        </div>
      )}

      <CancelRideDialog
        ride={rideToCancel}
        isOpen={!!rideToCancel}
        isCancelling={cancelRide.isPending}
        onClose={() => setRideToCancel(null)}
        onConfirm={() => {
          if (!rideToCancel) {
            return
          }

          cancelRide.mutate(rideToCancel.id, {
            onSuccess: () => setRideToCancel(null),
          })
        }}
      />
    </div>
  )
}
