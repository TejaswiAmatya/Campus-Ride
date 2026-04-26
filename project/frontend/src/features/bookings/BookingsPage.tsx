import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  useBookings,
  useConfirmBooking,
  useDeclineBooking,
  useCancelBooking,
} from "./hooks";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./StatusBadge";
import type { BookingListItem } from "./types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import {
  CalendarCheck,
  CheckCircle2,
  Clock3,
  MapPin,
  UserRound,
  Wallet,
} from "lucide-react";

export function BookingsPage() {
  const [view, setView] = useState<"passenger" | "driver">("passenger");
  const asDriver = view === "driver";
  const { data: bookings, isLoading } = useBookings({ asDriver });
  const confirmBooking = useConfirmBooking();
  const declineBooking = useDeclineBooking();
  const cancelBooking = useCancelBooking();

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border bg-gradient-to-r from-sky-50 via-white to-emerald-50">
        <div className="flex flex-col gap-4 p-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
              Trips
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              Bookings and ride requests
            </h1>
            <p className="max-w-2xl text-sm text-slate-600">
              Passengers can follow every update in one place, and drivers can
              quickly accept the right riders.
            </p>
          </div>

          <div className="inline-flex rounded-xl border bg-white/90 p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setView("passenger")}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium transition",
                view === "passenger"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100",
              )}
            >
              My bookings
            </button>
            <button
              type="button"
              onClick={() => setView("driver")}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium transition",
                view === "driver"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100",
              )}
            >
              Driver requests
            </button>
          </div>
        </div>
      </div>

      {!asDriver && (
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
      )}

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
          <p className="text-muted-foreground">
            {view === "passenger"
              ? "No bookings yet."
              : "No ride requests waiting right now."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {(bookings ?? []).map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              view={view}
              onCancel={() => cancelBooking.mutate(booking.id)}
              onConfirm={() => confirmBooking.mutate(booking.id)}
              onDecline={() => declineBooking.mutate(booking.id)}
              cancelPending={cancelBooking.isPending}
              confirmPending={confirmBooking.isPending}
              declinePending={declineBooking.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BookingCard({
  booking,
  view,
  onCancel,
  onConfirm,
  onDecline,
  cancelPending,
  confirmPending,
  declinePending,
}: {
  booking: BookingListItem;
  view: "passenger" | "driver";
  onCancel: () => void;
  onConfirm: () => void;
  onDecline: () => void;
  cancelPending: boolean;
  confirmPending: boolean;
  declinePending: boolean;
}) {
  const isPassenger = view === "passenger";
  const message =
    booking.status === "CONFIRMED"
      ? isPassenger
        ? "Your driver has accepted the ride. You are all set for pickup."
        : "This passenger is approved and counted into your ride plan."
      : booking.status === "COMPLETED"
        ? isPassenger
          ? "Ride completed. You reached your destination."
          : "Ride completed. Earnings from this passenger are now part of your trip summary."
        : booking.status === "CANCELLED"
          ? isPassenger
            ? "This booking is no longer active."
            : "This request was closed and is no longer travelling with you."
          : isPassenger
            ? "Waiting for the driver to accept your booking request."
            : "Review this request and choose whether to accept the passenger.";

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
                {booking.ride.originAddress} → {booking.ride.destinationAddress}
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
              {isPassenger
                ? `${booking.totalFare} NOK total`
                : `${booking.driverEarnings} NOK earned`}
            </MetaItem>
            <MetaItem icon={<CheckCircle2 className="h-4 w-4" />}>
              {isPassenger
                ? `Driver: ${booking.ride.driver.name}`
                : `Passenger: ${booking.passenger?.name ?? "Unknown"}`}
            </MetaItem>
          </div>
          {view === "passenger" && (
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
          )}
          {view === "passenger" && (
            <p className="text-xs text-muted-foreground">
              Driver: {booking.ride.driver?.name}
            </p>
          )}
          {view === "driver" && booking.passenger && (
            <p className="text-xs text-muted-foreground">
              Passenger: {booking.passenger.name}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-2 lg:items-end">
          <Button asChild variant="outline">
            <Link to={`/bookings/${booking.id}`}>Open details</Link>
          </Button>

          {isPassenger &&
            (booking.status === "PENDING" ||
              booking.status === "CONFIRMED") && (
              <Button
                variant="destructive"
                disabled={cancelPending}
                onClick={onCancel}
              >
                {cancelPending ? "Cancelling..." : "Cancel booking"}
              </Button>
            )}

          {!isPassenger && booking.status === "PENDING" && (
            <div className="flex gap-2">
              <Button disabled={confirmPending} onClick={onConfirm}>
                {confirmPending ? "Accepting..." : "Accept"}
              </Button>
              <Button
                variant="outline"
                disabled={declinePending}
                onClick={onDecline}
              >
                {declinePending ? "Declining..." : "Decline"}
              </Button>
            </div>
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
