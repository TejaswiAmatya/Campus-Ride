import { useMemo, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  CalendarCheck,
  CheckCircle2,
  Clock3,
  MapPin,
  UserRound,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  useBookings,
  useCancelBooking,
  useUpcomingPassengerBookings,
} from "./hooks";
import { StatusBadge } from "./StatusBadge";
import { UpcomingRideCard } from "./UpcomingRideCard";
import type { BookingListItem } from "./types";

export function BookingsPage() {
  const { data: bookings, isLoading } = useBookings();
  const { data: upcomingBookings = [] } = useUpcomingPassengerBookings();
  const cancelBooking = useCancelBooking();

  const passengerActivity = useMemo(() => {
    const upcomingIds = new Set(upcomingBookings.map((booking) => booking.id));
    return (bookings ?? []).filter((booking) => !upcomingIds.has(booking.id));
  }, [bookings, upcomingBookings]);

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border bg-gradient-to-r from-sky-50 via-white to-emerald-50">
        <div className="flex flex-col gap-4 p-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
              Trips
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              Your bookings
            </h1>
            <p className="max-w-2xl text-sm text-slate-600">
              Track your upcoming rides, pending requests, completed trips, and
              cancellations in one place.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">
        <p className="flex items-center gap-2 font-medium text-foreground">
          <Wallet className="h-4 w-4 text-primary" />
          Cancellation refund policy
        </p>
        <p className="mt-2 text-muted-foreground">
          Cancel more than 2 hours before departure for a full refund, cancel
          within 2 hours for a 50% refund, and no-shows receive no refund.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-36 animate-pulse rounded-2xl border bg-muted"
            />
          ))}
        </div>
      ) : (bookings ?? []).length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center">
          <CalendarCheck className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-muted-foreground">No bookings yet.</p>
        </div>
      ) : (
        <>
          {upcomingBookings.length > 0 && (
            <section className="space-y-4">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
                  Coming up
                </p>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                  Your next confirmed rides
                </h2>
                <p className="text-sm text-slate-600">
                  Track departure time, verify the pickup point, and cancel
                  quickly if your plans change.
                </p>
              </div>

              <div className="space-y-4">
                {upcomingBookings.map((booking) => (
                  <UpcomingRideCard
                    key={booking.id}
                    booking={booking}
                    cancelPending={
                      cancelBooking.isPending &&
                      cancelBooking.variables === booking.id
                    }
                    onCancel={() => cancelBooking.mutate(booking.id)}
                  />
                ))}
              </div>
            </section>
          )}

          <section className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold text-slate-950">
                {passengerActivity.length > 0 || upcomingBookings.length === 0
                  ? "All booking activity"
                  : "Past and pending activity"}
              </h2>
              <p className="text-sm text-slate-600">
                Requests still waiting on a driver, completed trips, and any
                cancellations stay here for reference.
              </p>
            </div>

            <div className="space-y-4">
              {passengerActivity.map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  onCancel={() => cancelBooking.mutate(booking.id)}
                  cancelPending={
                    cancelBooking.isPending &&
                    cancelBooking.variables === booking.id
                  }
                />
              ))}
            </div>

            {passengerActivity.length === 0 && upcomingBookings.length > 0 && (
              <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                Everything else is clear right now. Your confirmed upcoming
                rides are shown above.
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function BookingCard({
  booking,
  onCancel,
  cancelPending,
}: {
  booking: BookingListItem;
  onCancel: () => void;
  cancelPending: boolean;
}) {
  const message =
    booking.status === "CONFIRMED"
      ? "Your driver has accepted the ride. You are all set for pickup."
      : booking.status === "COMPLETED"
        ? "Ride completed. You reached your destination."
        : booking.status === "CANCELLED"
          ? "This booking is no longer active."
          : "Waiting for the driver to accept your booking request.";

  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              status={booking.status}
              className="rounded-full px-3 py-1"
            />
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
              Ref {booking.id.slice(0, 8)}
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
              <p className="text-base font-semibold text-slate-900">
                {booking.ride.originAddress} to{" "}
                {booking.ride.destinationAddress}
              </p>
            </div>
            <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
              {message}
            </p>
          </div>

          <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2 xl:grid-cols-4">
            <MetaItem icon={<Clock3 className="h-4 w-4" />}>
              {new Date(booking.ride.departureTime).toLocaleString("en-GB", {
                weekday: "short",
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </MetaItem>
            <MetaItem icon={<UserRound className="h-4 w-4" />}>
              {booking.seatsBooked} seat{booking.seatsBooked > 1 ? "s" : ""}
            </MetaItem>
            <MetaItem icon={<Wallet className="h-4 w-4" />}>
              {booking.totalFare} NOK total
            </MetaItem>
            <MetaItem icon={<CheckCircle2 className="h-4 w-4" />}>
              Driver: {booking.ride.driver.name}
            </MetaItem>
          </div>

          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span>Payment: {booking.payment.status}</span>
            {booking.status === "CANCELLED" && (
              <>
                <span>Refunded: {booking.refund.amount} NOK</span>
                <span>
                  Policy:{" "}
                  {booking.cancellation.policyApplied
                    ? booking.cancellation.policyApplied.replace("_", " ")
                    : "N/A"}
                </span>
              </>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Driver: {booking.ride.driver.name}
          </p>
        </div>

        <div className="flex shrink-0 flex-col gap-2 lg:items-end">
          <Button asChild variant="outline">
            <Link to={`/rides/${booking.ride.id}`}>Open details</Link>
          </Button>

          {(booking.status === "PENDING" || booking.status === "CONFIRMED") && (
            <Button
              variant="destructive"
              disabled={cancelPending}
              onClick={onCancel}
            >
              {cancelPending ? "Cancelling..." : "Cancel booking"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function MetaItem({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border bg-slate-50 px-3 py-2">
      <span className="text-slate-400">{icon}</span>
      <span>{children}</span>
    </div>
  );
}
