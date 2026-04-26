import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CalendarCheck, CheckCircle2, MapPin, Star, UserRound, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MapView } from '@/components/MapView'
import { useAuth } from '@/hooks/useAuth'
import { useBooking, useBookingRealtime, useCancelBooking, useCreateReview } from './hooks'
import { StatusBadge } from './StatusBadge'

function formatMoney(value: string | undefined) {
  return `${value ?? '0'} NOK`
}

export function BookingStatusPage() {
  useBookingRealtime()
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { data: booking, isLoading, isError } = useBooking(id)
  const cancelMutation = useCancelBooking()
  const reviewMutation = useCreateReview()
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="animate-pulse text-muted-foreground">Loading booking...</p>
      </div>
    )
  }

  if (isError || !booking) {
    return (
      <div className="mx-auto max-w-lg space-y-4 rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground">Booking not found or you do not have access.</p>
        <Button asChild variant="outline">
          <Link to="/bookings">Back to bookings</Link>
        </Button>
      </div>
    )
  }

  const canCancel = booking.status === 'PENDING' || booking.status === 'CONFIRMED'
  const isDriverViewing = user?.id === booking.ride.driver.id
  const reviewerLabel = isDriverViewing ? 'Rate this passenger' : 'Rate your driver'
  const reviewTarget = isDriverViewing ? booking.passenger.name : booking.ride.driver.name
  const canReview = booking.status === 'COMPLETED' && !booking.review

  const statusMessage =
    booking.status === 'CONFIRMED'
      ? 'Your driver has accepted the ride and everything is ready.'
      : booking.status === 'COMPLETED'
        ? 'Ride completed. You reached the destination successfully.'
        : booking.status === 'CANCELLED'
          ? 'This booking has been cancelled.'
          : 'Your booking is waiting for the driver to respond.'

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="overflow-hidden rounded-3xl border bg-gradient-to-br from-sky-50 via-white to-emerald-50">
        <div className="grid gap-6 p-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={booking.status} className="rounded-full px-3 py-1" />
              <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Reference {booking.id.slice(0, 8)}
              </span>
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                {booking.ride.originAddress} → {booking.ride.destinationAddress}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">{statusMessage}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryPill
                icon={<CalendarCheck className="h-4 w-4" />}
                label="Departure"
                value={new Date(booking.ride.departureTime).toLocaleString('en-GB', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              />
              <SummaryPill
                icon={<UserRound className="h-4 w-4" />}
                label="Seats"
                value={`${booking.seatsBooked} booked`}
              />
              <SummaryPill
                icon={<Wallet className="h-4 w-4" />}
                label={isDriverViewing ? 'You earned' : 'Trip total'}
                value={`${isDriverViewing ? booking.driverEarnings : booking.totalFare} NOK`}
              />
              <SummaryPill
                icon={<CheckCircle2 className="h-4 w-4" />}
                label={isDriverViewing ? 'Passenger' : 'Driver'}
                value={isDriverViewing ? booking.passenger.name : booking.ride.driver.name}
              />
            </div>
          </div>

          <div className="rounded-2xl border bg-white/90 p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Trip timeline</h2>
            <div className="mt-4 space-y-4 text-sm">
              <TimelineRow
                active={booking.status === 'PENDING'}
                done={booking.status !== 'PENDING'}
                title="Booking request sent"
                detail="Your seat request has been reserved for driver review."
              />
              <TimelineRow
                active={booking.status === 'CONFIRMED'}
                done={booking.status === 'COMPLETED'}
                title="Driver accepted"
                detail="You are all set for the ride."
              />
              <TimelineRow
                active={booking.ride.status === 'IN_PROGRESS'}
                done={booking.status === 'COMPLETED'}
                title="Ride in progress"
                detail="The driver has started the trip."
              />
              <TimelineRow
                active={booking.status === 'COMPLETED'}
                done={booking.status === 'COMPLETED'}
                title="Ride completed"
                detail="You reached the destination."
              />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="h-5 w-5 text-sky-600" />
              Route overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Pickup</p>
                <p className="mt-2 text-sm text-slate-700">{booking.ride.originAddress}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Destination</p>
                <p className="mt-2 text-sm text-slate-700">{booking.ride.destinationAddress}</p>
              </div>
            </div>

            <MapView
              height="h-72"
              markers={[
                {
                  position: [booking.ride.originLat, booking.ride.originLng],
                  label: `Pickup: ${booking.ride.originAddress}`,
                  type: 'origin',
                },
                {
                  position: [booking.ride.destinationLat, booking.ride.destinationLng],
                  label: `Dropoff: ${booking.ride.destinationAddress}`,
                  type: 'destination',
                },
              ]}
            />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg">Current status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <p>
                Payment status: <span className="font-medium text-slate-900">{booking.paymentStatus}</span>
              </p>
              <p>
                Ride state: <span className="font-medium text-slate-900">{booking.ride.status.replace('_', ' ')}</span>
              </p>
              <p>
                Last updated:{' '}
                <span className="font-medium text-slate-900">
                  {new Date(booking.updatedAt).toLocaleString('en-GB')}
                </span>
              </p>
            </CardContent>
          </Card>

          {canReview && (
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg">{reviewerLabel}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-slate-600">Share quick feedback for {reviewTarget} now that the trip is complete.</p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRating(value)}
                      className="rounded-full border p-2 transition hover:bg-amber-50"
                    >
                      <Star className={value <= rating ? 'h-5 w-5 fill-amber-400 text-amber-400' : 'h-5 w-5 text-slate-300'} />
                    </button>
                  ))}
                </div>
                <textarea
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  rows={4}
                  placeholder="Optional feedback"
                  className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                <Button
                  disabled={reviewMutation.isPending}
                  onClick={() =>
                    reviewMutation.mutate({
                      bookingId: booking.id,
                      rating,
                      comment: comment.trim() || undefined,
                    })
                  }
                >
                  {reviewMutation.isPending ? 'Saving...' : 'Submit rating'}
                </Button>
              </CardContent>
            </Card>
          )}

          {booking.review && (
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg">Rating submitted</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star
                      key={index}
                      className={index < booking.review!.rating ? 'h-4 w-4 fill-amber-400 text-amber-400' : 'h-4 w-4 text-slate-300'}
                    />
                  ))}
                </div>
                {booking.review.comment && <p className="text-sm text-slate-600">{booking.review.comment}</p>}
              </CardContent>
            </Card>
          )}

          <div className="flex flex-wrap gap-2">
            {canCancel && (
              <Button
                type="button"
                variant="destructive"
                disabled={cancelMutation.isPending}
                onClick={() => cancelMutation.mutate(booking.id)}
              >
                {cancelMutation.isPending ? 'Cancelling...' : 'Cancel booking'}
              </Button>
            )}
            <Button asChild variant="outline">
              <Link to="/bookings">All bookings</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/rides">Find more rides</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function SummaryPill({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border bg-white/90 p-4 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-3 text-sm font-medium text-slate-900">{value}</p>
    </div>
  )
}

function TimelineRow({
  active,
  done,
  title,
  detail,
}: {
  active: boolean
  done: boolean
  title: string
  detail: string
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <span
          className={
            done
              ? 'mt-0.5 h-3 w-3 rounded-full bg-emerald-500'
              : active
                ? 'mt-0.5 h-3 w-3 rounded-full bg-sky-500'
                : 'mt-0.5 h-3 w-3 rounded-full bg-slate-200'
          }
        />
        <span className="mt-1 h-full w-px bg-slate-200 last:hidden" />
      </div>
      <div className="pb-3">
        <p className="font-medium text-slate-900">{title}</p>
        <p className="text-slate-500">{detail}</p>
      </div>
    </div>
  )
}
