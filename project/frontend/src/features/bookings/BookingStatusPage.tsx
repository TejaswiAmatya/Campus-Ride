import { useEffect, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import {
  CalendarCheck,
  CheckCircle2,
  Clock3,
  MapPin,
  MessageSquareText,
  PhoneCall,
  Timer,
  UserRound,
  Wallet,
} from "lucide-react";

import { MapView } from "@/components/MapView";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RideChatPanel } from "@/features/chat/RideChatPanel";
import { useAuth } from "@/hooks/useAuth";

import { useBooking, useCancelBooking } from "./hooks";
import { StatusBadge } from "./StatusBadge";

function formatCountdown(target: string, now: number) {
  const diff = new Date(target).getTime() - now;

  if (diff <= 0) {
    return "Departing now";
  }

  const totalMinutes = Math.floor(diff / 60_000);
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

export function BookingStatusPage() {
  const { id } = useParams<{ id: string }>();
  const { data: booking, isLoading, isError } = useBooking(id);
  const cancelMutation = useCancelBooking();
  const [now, setNow] = useState(() => Date.now());
  const { user } = useAuth();

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 30_000);

    return () => window.clearInterval(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="animate-pulse text-muted-foreground">
          Loading booking...
        </p>
      </div>
    );
  }

  if (isError || !booking) {
    return (
      <div className="mx-auto max-w-lg space-y-4 rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground">
          Booking not found or you do not have access.
        </p>
        <Button asChild variant="outline">
          <Link to="/bookings">Back to bookings</Link>
        </Button>
      </div>
    );
  }

  const canCancel =
    booking.status === "PENDING" || booking.status === "CONFIRMED";
  const pickup = booking.pickup ?? {
    address: booking.ride.originAddress,
    lat: booking.ride.originLat,
    lng: booking.ride.originLng,
  };
  const dropoff = booking.dropoff ?? {
    address: booking.ride.destinationAddress,
    lat: booking.ride.destinationLat,
    lng: booking.ride.destinationLng,
  };
  const payment = booking.payment ?? {
    status: booking.paymentStatus,
    paidAt: booking.paidAt ?? null,
    refundedAt: booking.refundedAt ?? null,
  };
  const cancellation = booking.cancellation;
  const refund = booking.refund ?? {
    amount: booking.refundedAmount,
    remainingCharged: String(
      Number(booking.totalFare) - Number(booking.refundedAmount ?? "0"),
    ),
  };

  const isUpcomingConfirmed =
    booking.status === "CONFIRMED" &&
    new Date(booking.ride.departureTime).getTime() > now;
  const canAccessRideChat = booking.status === "CONFIRMED" && !!user;
  const rideChatParticipants = [
    {
      id: booking.ride.driver.id,
      name: booking.ride.driver.name,
      avatarPath: booking.ride.driver.avatarUrl,
    },
    {
      id: booking.passenger.id,
      name: booking.passenger.name,
      avatarPath: booking.passenger.avatarUrl,
    },
  ];

  const statusMessage =
    booking.status === "CONFIRMED"
      ? "Your driver has accepted the ride and everything is ready."
      : booking.status === "COMPLETED"
        ? "Ride completed. You reached the destination successfully."
        : booking.status === "CANCELLED"
          ? "This booking has been cancelled."
          : "Your booking is waiting for the driver to respond.";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="overflow-hidden rounded-3xl border bg-gradient-to-br from-sky-50 via-white to-emerald-50">
        <div className="grid gap-6 p-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge
                status={booking.status}
                className="rounded-full px-3 py-1"
              />
              {isUpcomingConfirmed && (
                <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                  Upcoming ride
                </span>
              )}
              <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Reference {booking.id.slice(0, 8)}
              </span>
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                {pickup.address} to {dropoff.address}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                {statusMessage}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryPill
                icon={<CalendarCheck className="h-4 w-4" />}
                label="Departure"
                value={new Date(booking.ride.departureTime).toLocaleString(
                  "en-GB",
                  {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  },
                )}
              />
              <SummaryPill
                icon={<Timer className="h-4 w-4" />}
                label="Countdown"
                value={formatCountdown(booking.ride.departureTime, now)}
              />
              <SummaryPill
                icon={<Wallet className="h-4 w-4" />}
                label="Charged"
                value={`${refund.remainingCharged} NOK`}
              />
              <SummaryPill
                icon={<UserRound className="h-4 w-4" />}
                label="Driver"
                value={booking.ride.driver.name}
              />
            </div>
          </div>

          <div className="rounded-2xl border bg-white/90 p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">
              Trip timeline
            </h2>
            <div className="mt-4 space-y-4 text-sm">
              <TimelineRow
                active={booking.status === "PENDING"}
                done={booking.status !== "PENDING"}
                title="Booking request sent"
                detail="Your seat request has been reserved for driver review."
              />
              <TimelineRow
                active={booking.status === "CONFIRMED"}
                done={booking.status === "COMPLETED"}
                title="Driver accepted"
                detail="You are all set for the ride."
              />
              <TimelineRow
                active={booking.ride.status === "IN_PROGRESS"}
                done={booking.status === "COMPLETED"}
                title="Ride in progress"
                detail="The driver has started the trip."
              />
              <TimelineRow
                active={booking.status === "COMPLETED"}
                done={booking.status === "COMPLETED"}
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
              Pickup and route
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Pickup
                </p>
                <p className="mt-2 text-sm text-slate-700">{pickup.address}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Destination
                </p>
                <p className="mt-2 text-sm text-slate-700">{dropoff.address}</p>
              </div>
            </div>

            <MapView
              height="h-72"
              markers={[
                {
                  position: [pickup.lat, pickup.lng],
                  label: `Pickup: ${pickup.address}`,
                  type: "origin",
                },
                {
                  position: [dropoff.lat, dropoff.lng],
                  label: `Dropoff: ${dropoff.address}`,
                  type: "destination",
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
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-muted/20 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Payment status
                </p>
                <p className="mt-1 text-sm font-semibold">{payment.status}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {payment.paidAt
                    ? `Captured at ${new Date(payment.paidAt).toLocaleString()}`
                    : "No capture timestamp available."}
                </p>
                {payment.refundedAt && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Refunded at {new Date(payment.refundedAt).toLocaleString()}
                  </p>
                )}
              </div>

              <div className="rounded-lg border bg-slate-50 p-3">
                <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                  <PhoneCall className="h-4 w-4 text-sky-600" />
                  Driver contact
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {booking.ride.driver.name}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Open the driver profile if you need to double-check ride
                  details before departure.
                </p>
                <div className="mt-3">
                  <Button asChild size="sm" variant="outline">
                    <Link to={`/profile/${booking.ride.driver.id}`}>
                      View driver profile
                    </Link>
                  </Button>
                </div>
              </div>

              {booking.messageToDriver && (
                <div className="rounded-lg border bg-slate-50 p-3">
                  <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                    <MessageSquareText className="h-4 w-4 text-sky-600" />
                    Message to driver
                  </p>
                  <p className="mt-2 text-sm text-slate-700">
                    {booking.messageToDriver}
                  </p>
                </div>
              )}

              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
                <p className="flex items-center gap-2 font-medium text-foreground">
                  <Wallet className="h-4 w-4 text-primary" />
                  Cancellation refund policy
                </p>
                <p className="mt-2 text-muted-foreground">
                  Full refund if cancelled more than{" "}
                  {cancellation.rules.fullRefundBeforeHours} hours before
                  departure, {cancellation.rules.partialRefundPercent}% refund
                  if cancelled within that final window, and{" "}
                  {cancellation.rules.noShowRefundPercent}% refund for no-shows.
                </p>
                {cancellation.policyApplied && (
                  <p className="mt-2 font-medium text-foreground">
                    Applied policy:{" "}
                    {cancellation.policyApplied.replace("_", " ")}
                  </p>
                )}
                {booking.status === "CANCELLED" && (
                  <p className="mt-2 text-muted-foreground">
                    Refunded: {refund.amount} NOK
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {canAccessRideChat && user && (
            <RideChatPanel
              rideId={booking.ride.id}
              currentUserId={user.id}
              knownParticipants={rideChatParticipants}
            />
          )}

          <div className="flex flex-wrap gap-2">
            {canCancel && (
              <Button
                type="button"
                variant="destructive"
                disabled={cancelMutation.isPending}
                onClick={() => cancelMutation.mutate(booking.id)}
              >
                {cancelMutation.isPending ? "Cancelling..." : "Quick cancel"}
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
  );
}

function SummaryPill({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border bg-white/90 p-4 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-3 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}

function TimelineRow({
  active,
  done,
  title,
  detail,
}: {
  active: boolean;
  done: boolean;
  title: string;
  detail: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <span
          className={
            done
              ? "mt-0.5 h-3 w-3 rounded-full bg-emerald-500"
              : active
                ? "mt-0.5 h-3 w-3 rounded-full bg-sky-500"
                : "mt-0.5 h-3 w-3 rounded-full bg-slate-200"
          }
        />
        <span className="mt-1 h-full w-px bg-slate-200 last:hidden" />
      </div>
      <div className="pb-3">
        <p className="font-medium text-slate-900">{title}</p>
        <p className="text-slate-500">{detail}</p>
      </div>
    </div>
  );
}
