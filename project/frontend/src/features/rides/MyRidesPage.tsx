import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Banknote,
  CarFront,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  MapPin,
  Plus,
  Star,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDriverBookingNewListener } from "@/features/bookings/hooks";
import { useAuth } from "@/hooks/useAuth";
import {
  useCreateReview,
  useConfirmBooking,
  useDeclineBooking,
} from "@/features/bookings/hooks";
import {
  useCancelRide,
  useDriverLocationEmitter,
  useMyRides,
  useUpdateRideStatus,
} from "./hooks";
import type { Ride, RideBooking, RideStatusUpdate } from "./types";

const statusLabels: Record<Ride["status"], string> = {
  OPEN: "Scheduled",
  FULL: "Full",
  IN_PROGRESS: "On the road",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const statusVariants: Record<
  Ride["status"],
  "default" | "secondary" | "destructive" | "outline"
> = {
  OPEN: "secondary",
  FULL: "secondary",
  IN_PROGRESS: "default",
  COMPLETED: "outline",
  CANCELLED: "destructive",
};

function availableActions(status: Ride["status"]) {
  if (status === "OPEN" || status === "FULL") {
    return ["ACTIVE"] as const;
  }

  if (status === "IN_PROGRESS") {
    return ["COMPLETED"] as const;
  }

  return [] as const;
}

function actionLabel(status: RideStatusUpdate) {
  if (status === "ACTIVE") return "Start ride";
  if (status === "COMPLETED") return "Complete ride";
  return "Cancel ride";
}

function actionVariant(
  status: RideStatusUpdate,
): "default" | "outline" | "destructive" {
  if (status === "CANCELLED") return "destructive";
  if (status === "COMPLETED") return "outline";
  return "default";
}

export function MyRidesPage() {
  const { user } = useAuth();
  const { data: rides, isLoading } = useMyRides();
  const updateRideStatus = useUpdateRideStatus();
  const cancelRide = useCancelRide();
  const confirmBooking = useConfirmBooking();
  const declineBooking = useDeclineBooking();
  const createReview = useCreateReview();
  const [expandedRideId, setExpandedRideId] = useState<string | null>(null);
  const [rideToCancel, setRideToCancel] = useState<Ride | null>(null);

  if (!user || user.role !== "DRIVER") {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
        This page is only available to drivers.
      </div>
    );
  }

  const totals = (rides ?? []).reduce(
    (acc, ride) => {
      acc.rides += 1;
      acc.earned += Number(ride.stats?.completedEarnings ?? 0);
      acc.passengers += ride.stats?.completedPassengers ?? 0;
      acc.pending += ride.stats?.pendingRequests ?? 0;
      return acc;
    },
    { rides: 0, earned: 0, passengers: 0, pending: 0 },
  );

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-800 text-white">
        <div className="flex flex-col gap-6 p-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200/80">
              Driver hub
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">
              Manage rides, riders, and earnings
            </h1>
            <p className="max-w-2xl text-sm text-slate-200">
              Accept the right passengers, keep trips moving, and review what
              each completed ride earned.
            </p>
          </div>
          <Button
            asChild
            className="bg-white text-slate-900 hover:bg-slate-100"
          >
            <Link to="/driver/rides/new">
              <Plus className="mr-2 h-4 w-4" />
              Post a ride
            </Link>
          </Button>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DriverMetric
          title="Completed earnings"
          value={`${totals.earned.toFixed(2)} NOK`}
          helper="Across completed rides"
        />
        <DriverMetric
          title="Passengers travelled"
          value={`${totals.passengers}`}
          helper="Completed seats moved"
        />
        <DriverMetric
          title="Open requests"
          value={`${totals.pending}`}
          helper="Need driver action"
        />
        <DriverMetric
          title="Total rides"
          value={`${totals.rides}`}
          helper="Scheduled and past rides"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-40 animate-pulse rounded-2xl border bg-muted"
            />
          ))}
        </div>
      ) : (rides ?? []).length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center">
          <CarFront className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-muted-foreground">
            You have not posted any rides yet.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {(rides ?? []).map((ride) => (
            <RideCard
              key={ride.id}
              ride={ride}
              isExpanded={expandedRideId === ride.id}
              isUpdatingStatus={updateRideStatus.isPending}
              isCancellingRide={
                cancelRide.isPending && rideToCancel?.id === ride.id
              }
              isConfirming={confirmBooking.isPending}
              isDeclining={declineBooking.isPending}
              isReviewing={createReview.isPending}
              onToggleExpanded={() =>
                setExpandedRideId((current) =>
                  current === ride.id ? null : ride.id,
                )
              }
              onUpdateStatus={(status) =>
                updateRideStatus.mutate({ rideId: ride.id, status })
              }
              onRequestCancel={() => setRideToCancel(ride)}
              onConfirmBooking={(bookingId) => confirmBooking.mutate(bookingId)}
              onDeclineBooking={(bookingId) => declineBooking.mutate(bookingId)}
              onCreateReview={(bookingId, rating) =>
                createReview.mutate({ bookingId, rating })
              }
            />
          ))}
        </div>
      )}

      <CancelRideDialog
        ride={rideToCancel}
        isOpen={!!rideToCancel}
        isCancelling={cancelRide.isPending}
        onClose={() => setRideToCancel(null)}
        onConfirm={() => {
          if (!rideToCancel) return;

          cancelRide.mutate(rideToCancel.id, {
            onSuccess: () => setRideToCancel(null),
          });
        }}
      />
    </div>
  );
}

function RideCard({
  ride,
  isExpanded,
  isUpdatingStatus,
  isCancellingRide,
  isConfirming,
  isDeclining,
  isReviewing,
  onToggleExpanded,
  onUpdateStatus,
  onRequestCancel,
  onConfirmBooking,
  onDeclineBooking,
  onCreateReview,
}: {
  ride: Ride;
  isExpanded: boolean;
  isUpdatingStatus: boolean;
  isCancellingRide: boolean;
  isConfirming: boolean;
  isDeclining: boolean;
  isReviewing: boolean;
  onToggleExpanded: () => void;
  onUpdateStatus: (status: RideStatusUpdate) => void;
  onRequestCancel: () => void;
  onConfirmBooking: (bookingId: string) => void;
  onDeclineBooking: (bookingId: string) => void;
  onCreateReview: (bookingId: string, rating: number) => void;
}) {
  const actions = availableActions(ride.status);
  const bookings = ride.bookings ?? [];
  const stats = ride.stats;
  const { isSharingLocation } = useDriverLocationEmitter(
    ride.status === "IN_PROGRESS" ? ride.id : undefined,
  );
  const canCancelRide = ride.status === "OPEN" || ride.status === "FULL";
  const summaryCopy =
    ride.status === "COMPLETED"
      ? `Ride completed. ${stats?.completedPassengers ?? 0} passenger seats reached the destination and ${stats?.completedEarnings ?? "0.00"} NOK has been locked in.`
      : ride.status === "IN_PROGRESS"
        ? "Ride is live. Passenger status will move to completed when you finish the trip."
        : `You have ${stats?.pendingRequests ?? 0} request${stats?.pendingRequests === 1 ? "" : "s"} waiting for a decision.`;

  return (
    <div className="rounded-3xl border bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusVariants[ride.status]}>
              {statusLabels[ride.status]}
            </Badge>
            {isSharingLocation && (
              <Badge variant="secondary" className="gap-1.5">
                <span
                  className="h-2 w-2 rounded-full bg-emerald-500"
                  aria-hidden="true"
                />
                Sharing location
              </Badge>
            )}
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
              Ride {ride.id.slice(0, 8)}
            </span>
          </div>

          <div>
            <div className="flex items-start gap-2 text-lg font-semibold text-slate-900">
              <MapPin className="mt-1 h-4 w-4 shrink-0 text-sky-600" />
              <span>
                {ride.originAddress}{" "}
                <ArrowRight className="mx-1 inline h-4 w-4" />{" "}
                {ride.destinationAddress}
              </span>
            </div>
            <p className="mt-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              {summaryCopy}
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <TripMetric
              icon={<Clock3 className="h-4 w-4" />}
              label="Departure"
              value={new Date(ride.departureTime).toLocaleString("en-GB", {
                weekday: "short",
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            />
            <TripMetric
              icon={<Users className="h-4 w-4" />}
              label="Passengers"
              value={`${stats?.completedPassengers ?? 0}/${stats?.totalPassengers ?? 0} completed`}
            />
            <TripMetric
              icon={<Banknote className="h-4 w-4" />}
              label="This ride earned"
              value={`${ride.status === "COMPLETED" ? stats?.completedEarnings : (stats?.totalEarnings ?? "0.00")} NOK`}
            />
            <TripMetric
              icon={<CheckCircle2 className="h-4 w-4" />}
              label="Requests"
              value={`${stats?.pendingRequests ?? 0} pending`}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 xl:justify-end">
          <Button variant="outline" onClick={onToggleExpanded}>
            {isExpanded ? (
              <ChevronUp className="mr-2 h-4 w-4" />
            ) : (
              <ChevronDown className="mr-2 h-4 w-4" />
            )}
            {isExpanded ? "Hide riders" : "View riders"}
          </Button>
          {actions.map((status) => (
            <Button
              key={status}
              variant={actionVariant(status)}
              disabled={isUpdatingStatus}
              onClick={() => onUpdateStatus(status)}
            >
              {actionLabel(status)}
            </Button>
          ))}
          {canCancelRide && (
            <Button
              variant="destructive"
              disabled={isCancellingRide}
              onClick={onRequestCancel}
            >
              {isCancellingRide ? "Cancelling..." : "Cancel ride"}
            </Button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="mt-5 rounded-2xl border bg-slate-50/60 p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Passenger requests and ride history
              </h2>
              <p className="text-sm text-slate-500">
                Accept new riders, review completed riders, and keep track of
                what each trip earned.
              </p>
            </div>
          </div>

          {bookings.length === 0 ? (
            <p className="rounded-2xl border border-dashed bg-white px-4 py-6 text-sm text-muted-foreground">
              No booking requests yet.
            </p>
          ) : (
            <div className="space-y-3">
              {bookings.map((booking) => (
                <PassengerRow
                  key={booking.id}
                  booking={booking}
                  isConfirming={isConfirming}
                  isDeclining={isDeclining}
                  isReviewing={isReviewing}
                  onConfirm={() => onConfirmBooking(booking.id)}
                  onDecline={() => onDeclineBooking(booking.id)}
                  onCreateReview={(rating) =>
                    onCreateReview(booking.id, rating)
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PassengerRow({
  booking,
  isConfirming,
  isDeclining,
  isReviewing,
  onConfirm,
  onDecline,
  onCreateReview,
}: {
  booking: RideBooking;
  isConfirming: boolean;
  isDeclining: boolean;
  isReviewing: boolean;
  onConfirm: () => void;
  onDecline: () => void;
  onCreateReview: (rating: number) => void;
}) {
  const [rating, setRating] = useState(5);
  const helper =
    booking.status === "PENDING"
      ? "Waiting for your decision."
      : booking.status === "CONFIRMED"
        ? "Accepted and ready for the trip."
        : booking.status === "COMPLETED"
          ? "Ride completed and passenger reached the destination."
          : "This request is no longer active.";

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-slate-900">
              {booking.passenger.name}
            </p>
            <Badge
              variant={
                booking.status === "COMPLETED"
                  ? "outline"
                  : booking.status === "CONFIRMED"
                    ? "default"
                    : booking.status === "PENDING"
                      ? "secondary"
                      : "destructive"
              }
            >
              {booking.status.toLowerCase()}
            </Badge>
          </div>
          <p className="text-sm text-slate-500">{helper}</p>
          <div className="flex flex-wrap gap-2 text-sm text-slate-600">
            <span className="rounded-full bg-slate-100 px-3 py-1">
              {booking.seatsBooked} seat{booking.seatsBooked > 1 ? "s" : ""}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1">
              {booking.driverEarnings} NOK earned
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1">
              {booking.totalFare} NOK fare
            </span>
          </div>
          {booking.review && (
            <div className="flex items-center gap-1 text-amber-500">
              {Array.from({ length: 5 }).map((_, index) => (
                <Star
                  key={index}
                  className={
                    index < booking.review!.rating
                      ? "h-4 w-4 fill-amber-400 text-amber-400"
                      : "h-4 w-4 text-slate-300"
                  }
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          {booking.status === "PENDING" && (
            <>
              <Button disabled={isConfirming} onClick={onConfirm}>
                {isConfirming ? "Accepting..." : "Accept passenger"}
              </Button>
              <Button
                variant="outline"
                disabled={isDeclining}
                onClick={onDecline}
              >
                {isDeclining ? "Declining..." : "Decline"}
              </Button>
            </>
          )}

          {booking.status === "COMPLETED" && !booking.review && (
            <div className="flex items-center gap-2 rounded-2xl border bg-slate-50 px-3 py-2">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(value)}
                  >
                    <Star
                      className={
                        value <= rating
                          ? "h-4 w-4 fill-amber-400 text-amber-400"
                          : "h-4 w-4 text-slate-300"
                      }
                    />
                  </button>
                ))}
              </div>
              <Button
                size="sm"
                disabled={isReviewing}
                onClick={() => onCreateReview(rating)}
              >
                {isReviewing ? "Saving..." : "Rate passenger"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DriverMetric({
  title,
  value,
  helper,
}: {
  title: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-3 text-2xl font-semibold text-slate-900">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{helper}</p>
    </div>
  );
}

function TripMetric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        {icon}
        {label}
      </div>
      <p className="mt-3 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}

function CancelRideDialog({
  ride,
  isOpen,
  isCancelling,
  onConfirm,
  onClose,
}: {
  ride: Ride | null;
  isOpen: boolean;
  isCancelling: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  if (!isOpen || !ride) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-ride-title"
    >
      <div className="w-full max-w-md rounded-2xl border bg-background p-6 shadow-xl">
        <div className="space-y-2">
          <h2 id="cancel-ride-title" className="text-lg font-semibold">
            Cancel this ride?
          </h2>
          <p className="text-sm text-muted-foreground">
            {ride.originAddress} → {ride.destinationAddress}
          </p>
          <p className="text-sm text-muted-foreground">
            Confirmed passengers will be informed and their bookings will be
            closed automatically.
          </p>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" disabled={isCancelling} onClick={onClose}>
            Keep ride
          </Button>
          <Button
            variant="destructive"
            disabled={isCancelling}
            onClick={onConfirm}
          >
            {isCancelling ? "Cancelling..." : "Confirm cancel"}
          </Button>
        </div>
      </div>
    </div>
  );
}
