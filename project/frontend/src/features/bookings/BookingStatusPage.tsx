import { Link, useParams } from 'react-router-dom'
import { AlertCircle, CalendarCheck, CreditCard, MapPin, MessageSquare, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MapView } from '@/components/MapView'
import { useBooking, useCancelBooking } from './hooks'
import { StatusBadge } from './StatusBadge'

function formatMoney(value: string | undefined) {
  return `${value ?? '0'} NOK`
}

export function BookingStatusPage() {
  const { id } = useParams<{ id: string }>()
  const { data: booking, isLoading, isError } = useBooking(id)
  const cancelMutation = useCancelBooking()

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
  const pickup = booking.pickup ?? {
    address: booking.ride.originAddress,
    lat: booking.ride.originLat,
    lng: booking.ride.originLng,
  }
  const dropoff = booking.dropoff ?? {
    address: booking.ride.destinationAddress,
    lat: booking.ride.destinationLat,
    lng: booking.ride.destinationLng,
  }
  const payment = booking.payment ?? {
    status: booking.paymentStatus,
    paidAt: booking.paidAt ?? null,
    refundedAt: booking.refundedAt ?? null,
  }
  const refund = booking.refund ?? {
    amount: booking.refundedAmount,
    remainingCharged: String(Number(booking.totalFare) - Number(booking.refundedAmount ?? '0')),
  }

  const handleCancel = () => {
    if (!booking.id || !canCancel || cancelMutation.isPending) return
    const confirmed = window.confirm(
      'Cancel this booking? The reserved seat(s) will be released back to the ride.',
    )
    if (!confirmed) return
    cancelMutation.mutate(booking.id)
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Booking status</h1>
          <p className="text-sm text-muted-foreground">Reference #{booking.id.slice(0, 8)}</p>
        </div>
        <StatusBadge status={booking.status} className="text-sm" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-5 w-5 text-primary" />
                {booking.ride.originAddress} to {booking.ride.destinationAddress}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <CalendarCheck className="h-4 w-4" />
                  {new Date(booking.ride.departureTime).toLocaleString()}
                </span>
                <span>{booking.seatsBooked} seat(s)</span>
                <span className="font-medium text-foreground">{booking.totalFare} NOK total</span>
              </div>
              <p className="text-sm">
                Driver: <span className="font-medium">{booking.ride.driver.name}</span>
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border bg-muted/20 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Pickup point</p>
                  <p className="mt-1 text-sm font-medium">{pickup.address}</p>
                </div>
                <div className="rounded-lg border bg-muted/20 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Drop-off point</p>
                  <p className="mt-1 text-sm font-medium">{dropoff.address}</p>
                </div>
              </div>

              {booking.messageToDriver && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    Message to driver
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">{booking.messageToDriver}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <MapView
            height="h-72"
            markers={[
              {
                position: [pickup.lat, pickup.lng],
                label: `Pickup: ${pickup.address}`,
                type: 'origin',
              },
              {
                position: [dropoff.lat, dropoff.lng],
                label: `Drop-off: ${dropoff.address}`,
                type: 'destination',
              },
            ]}
          />
        </div>

        <div className="space-y-6">
          <Card className="border-primary/15">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="h-5 w-5 text-primary" />
                Payment summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Capture status</p>
                <p className="mt-1 text-sm font-semibold">{payment.status}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {payment.paidAt
                    ? `Captured at ${new Date(payment.paidAt).toLocaleString()}`
                    : 'No capture timestamp available.'}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <div className="rounded-lg border p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Charged</p>
                  <p className="mt-1 text-sm font-semibold">{formatMoney(booking.totalFare)}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Refunded</p>
                  <p className="mt-1 text-sm font-semibold">{formatMoney(refund.amount)}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Still charged</p>
                  <p className="mt-1 text-sm font-semibold">{formatMoney(refund.remainingCharged)}</p>
                </div>
              </div>

              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
                <p className="flex items-center gap-2 font-medium text-foreground">
                  <Wallet className="h-4 w-4 text-primary" />
                  Simulated provider boundary
                </p>
                <p className="mt-2 text-muted-foreground">
                  This payment was captured through the simulated adapter. The booking API now returns the same payment
                  snapshot shape a future Stripe provider can reuse.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2">
            {canCancel && (
              <Button
                type="button"
                variant="destructive"
                disabled={cancelMutation.isPending}
                onClick={handleCancel}
              >
                <AlertCircle className="mr-1.5 h-4 w-4" />
                {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Booking'}
              </Button>
            )}
            <Button asChild variant="outline">
              <Link to="/rides">Find more rides</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/bookings">All bookings</Link>
            </Button>
          </div>

          {cancelMutation.isError && (
            <p className="text-sm text-destructive">
              Could not cancel this booking. It may have been updated already.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
