import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CalendarClock, MapPin, MessageSquareText, PhoneCall, Timer, Wallet } from 'lucide-react'

import { MapView } from '@/features/rides/components/MapView'
import { Button } from '@/components/ui/button'

import { StatusBadge } from './StatusBadge'
import type { BookingListItem } from '../types'

function formatCountdown(target: string, now: number) {
  const diff = new Date(target).getTime() - now

  if (diff <= 0) {
    return 'Departing now'
  }

  const totalMinutes = Math.floor(diff / 60_000)
  const days = Math.floor(totalMinutes / (60 * 24))
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
  const minutes = totalMinutes % 60

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }

  return `${minutes}m`
}

export function UpcomingRideCard({
  booking,
  cancelPending,
  onCancel,
}: {
  booking: BookingListItem
  cancelPending: boolean
  onCancel: () => void
}) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now())
    }, 30_000)

    return () => window.clearInterval(timer)
  }, [])

  const pickup = booking.pickup
  const dropoff = booking.dropoff
  const markers =
    pickup && dropoff
      ? [
          {
            position: [pickup.lat, pickup.lng] as [number, number],
            label: `Pickup: ${pickup.address}`,
            type: 'origin' as const,
          },
          {
            position: [dropoff.lat, dropoff.lng] as [number, number],
            label: `Dropoff: ${dropoff.address}`,
            type: 'destination' as const,
          },
        ]
      : []

  const countdown = useMemo(
    () => formatCountdown(booking.ride.departureTime, now),
    [booking.ride.departureTime, now],
  )

  return (
    <article className="overflow-hidden rounded-3xl border bg-white shadow-sm">
      <div className="grid gap-0 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5 p-6">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={booking.status} className="rounded-full px-3 py-1" />
            <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
              Upcoming ride
            </span>
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
              Ref {booking.id.slice(0, 8)}
            </span>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
              {booking.pickup?.address ?? booking.ride.originAddress} to{' '}
              {booking.dropoff?.address ?? booking.ride.destinationAddress}
            </h2>
            <p className="text-sm text-slate-600">
              Your driver has confirmed this ride. Keep an eye on the pickup point and departure countdown.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <InfoPill
              icon={<Timer className="h-4 w-4" />}
              label="Departs in"
              value={countdown}
            />
            <InfoPill
              icon={<CalendarClock className="h-4 w-4" />}
              label="Departure"
              value={new Date(booking.ride.departureTime).toLocaleString('en-GB', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            />
            <InfoPill
              icon={<Wallet className="h-4 w-4" />}
              label="Charged"
              value={`${booking.refund.remainingCharged} NOK`}
            />
            <InfoPill
              icon={<PhoneCall className="h-4 w-4" />}
              label="Driver contact"
              value={booking.ride.driver.name}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Pickup
              </p>
              <p className="mt-2 flex items-start gap-2 text-sm text-slate-700">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              {pickup?.address ?? booking.ride.originAddress}
              </p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Dropoff
              </p>
              <p className="mt-2 flex items-start gap-2 text-sm text-slate-700">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                {dropoff?.address ?? booking.ride.destinationAddress}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Driver contact
              </p>
              <p className="mt-2 text-sm font-medium text-slate-900">
                {booking.ride.driver.name}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Open the driver profile before departure if you need the latest trip details.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link to={`/profile/${booking.ride.driver.id}`}>View profile</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link to={`/rides/${booking.ride.id}`}>Open details</Link>
                </Button>
              </div>
              {booking.messageToDriver && (
                <div className="mt-4 rounded-xl border bg-white px-3 py-3 text-sm text-slate-600">
                  <p className="flex items-center gap-2 font-medium text-slate-800">
                    <MessageSquareText className="h-4 w-4 text-sky-600" />
                    Your message to the driver
                  </p>
                  <p className="mt-2">{booking.messageToDriver}</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="destructive"
              disabled={cancelPending}
              onClick={onCancel}
            >
              {cancelPending ? 'Cancelling...' : 'Quick cancel'}
            </Button>
            <Button asChild variant="outline">
              <Link to={`/rides/${booking.ride.id}`}>Full details</Link>
            </Button>
          </div>
        </div>

        <div className="border-t bg-slate-50/70 p-4 xl:border-l xl:border-t-0">
          <MapView height="h-full min-h-[320px]" markers={markers} />
        </div>
      </div>
    </article>
  )
}

function InfoPill({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border bg-slate-50 px-4 py-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-2 text-sm font-medium text-slate-900">{value}</p>
    </div>
  )
}
