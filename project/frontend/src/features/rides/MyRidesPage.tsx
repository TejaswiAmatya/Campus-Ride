import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Banknote,
  CarFront,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  MapPin,
  Plus,
  Star,
  UserCheck,
  UserRoundX,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  useCreateReview,
  useConfirmBooking,
  useDeclineBooking,
  useMarkBookingNoShow,
  useMarkBookingPickedUp,
} from "@/features/bookings/hooks";
import { EditRideForm } from "./components/EditRideForm";
import {
  useCancelRide,
  useDriverLocationEmitter,
  useFinishRide,
  useMyRides,
  useStartRide,
  useUpdateRide,
  useUpdateRideStatus,
} from "./hooks";
import type { Ride, RideBooking, RideStatusUpdate } from "./types";
const rideStatusLabels: Record<Ride["status"], string> = {
  OPEN: "Scheduled",
  FULL: "Full",
  IN_PROGRESS: "On the road",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const rideStatusVariants: Record<
  Ride["status"],
  "default" | "secondary" | "destructive" | "outline"
> = {
  OPEN: "secondary",
  FULL: "secondary",
  IN_PROGRESS: "default",
  COMPLETED: "outline",
  CANCELLED: "destructive",
};

const bookingStatusLabels: Record<RideBooking["status"], string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
};

const bookingStatusVariants: Record<
  RideBooking["status"],
  "default" | "secondary" | "destructive" | "outline"
> = {
  PENDING: "secondary",
  CONFIRMED: "default",
  CANCELLED: "destructive",
  COMPLETED: "outline",
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
  const startRide = useStartRide();
  const finishRide = useFinishRide();
  const updateRide = useUpdateRide();
  const cancelRide = useCancelRide();
  const confirmBooking = useConfirmBooking();
  const declineBooking = useDeclineBooking();
  const createReview = useCreateReview();
  const [expandedRideId, setExpandedRideId] = useState<string | null>(null);
  const [rideToCancel, setRideToCancel] = useState<Ride | null>(null);
  const [rideToEdit, setRideToEdit] = useState<Ride | null>(null);

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
              isUpdatingStatus={startRide.isPending || finishRide.isPending}
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
              onUpdateStatus={(status) => {
                if (status === "ACTIVE") {
                  startRide.mutate(ride.id);
                  return;
                }

                if (status === "COMPLETED") {
                  finishRide.mutate(ride.id);
                }
              }}
              onRequestCancel={() => setRideToCancel(ride)}
              onRequestEdit={() => setRideToEdit(ride)}
              onConfirmBooking={(bookingId) => confirmBooking.mutate(bookingId)}
              onDeclineBooking={(bookingId) => declineBooking.mutate(bookingId)}
              onCreateReview={(bookingId, rating) =>
                createReview.mutate({ bookingId, rating })
              }
              onMarkPickedUp={(bookingId) =>
                useMarkBookingPickedUp().mutate(bookingId, {
                  onSuccess: () =>
                    setLocallyPickedUpBookingIds((current) =>
                      current.includes(bookingId)
                        ? current
                        : [...current, bookingId],
                    ),
                })
              }
              onMarkNoShow={(bookingId) =>
                useMarkBookingNoShow().mutate(bookingId, {
                  onSuccess: () =>
                    setLocallyNoShowBookingIds((current) =>
                      current.includes(bookingId)
                        ? current
                        : [...current, bookingId],
                    ),
                })
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

      <EditRideForm
        ride={rideToEdit}
        isOpen={!!rideToEdit}
        isSaving={updateRide.isPending}
        onClose={() => setRideToEdit(null)}
        onSubmit={({ rideId, payload }) =>
          updateRide.mutate(
            { rideId, payload },
            {
              onSuccess: () => setRideToEdit(null),
            },
          )
        }
      />
    </div>
  );
}

interface RideCardProps {
  ride: Ride;
  isExpanded: boolean;
  isUpdatingStatus: boolean;
  isCancellingRide: boolean;
  isConfirming: boolean;
  isDeclining: boolean;
  isReviewing: boolean;
  locallyPickedUpBookingIds: Set<string>;
  locallyNoShowBookingIds: Set<string>;
  pickupPendingBookingId: string | null;
  noShowPendingBookingId: string | null;
  onToggleExpanded: () => void;
  onUpdateStatus: (status: RideStatusUpdate) => void;
  onRequestCancel: () => void;
  onRequestEdit: () => void;
  onConfirmBooking: (bookingId: string) => void;
  onDeclineBooking: (bookingId: string) => void;
  onCreateReview: (bookingId: string, rating: number) => void;
  onMarkPickedUp: (bookingId: string) => void;
  onMarkNoShow: (bookingId: string) => void;
}

function RideCard({
  ride,
  isExpanded,
  isUpdatingStatus,
  isCancellingRide,
  isConfirming,
  isDeclining,
  isReviewing,
  locallyPickedUpBookingIds,
  locallyNoShowBookingIds,
  pickupPendingBookingId,
  noShowPendingBookingId,
  onToggleExpanded,
  onUpdateStatus,
  onRequestCancel,
  onRequestEdit,
  onConfirmBooking,
  onDeclineBooking,
  onCreateReview,
  onMarkPickedUp,
  onMarkNoShow,
}: RideCardProps) {
  const actions = availableActions(ride.status);
  const bookings = ride.bookings ?? [];
  const confirmedBookings = bookings.filter(
    (booking) => booking.status === "CONFIRMED",
  );
  const displayedBookings =
    ride.status === "IN_PROGRESS" ? confirmedBookings : bookings;
  const canCancelRide = ride.status === "OPEN" || ride.status === "FULL";
  const canManagePassengers =
    ride.status === "IN_PROGRESS" && confirmedBookings.length > 0;
  const showRequestsToggle = ride.status !== "IN_PROGRESS";
  const showExpandedSection = ride.status === "IN_PROGRESS" ? true : isExpanded;
  const { isSharingLocation } = useDriverLocationEmitter(
    ride.status === "IN_PROGRESS" ? ride.id : undefined,
  );

  return (
    <div className="rounded-3xl border bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={rideStatusVariants[ride.status]}>
              {rideStatusLabels[ride.status]}
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

          <div className="flex items-start gap-2 text-base font-medium">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              {ride.originAddress} to {ride.destinationAddress}
            </span>
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
              value={`${ride.stats?.completedPassengers ?? 0}/${ride.stats?.totalPassengers ?? 0} completed`}
            />
            <TripMetric
              icon={<Banknote className="h-4 w-4" />}
              label="This ride earned"
              value={`${ride.status === "COMPLETED" ? (ride.stats?.completedEarnings ?? "0.00") : (ride.stats?.totalEarnings ?? "0.00")} NOK`}
            />
            <TripMetric
              icon={<CheckCircle2 className="h-4 w-4" />}
              label="Requests"
              value={`${ride.stats?.pendingRequests ?? 0} pending`}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 xl:justify-end">
          {showRequestsToggle && (
            <Button variant="outline" onClick={onToggleExpanded}>
              {isExpanded ? (
                <ChevronUp className="mr-2 h-4 w-4" />
              ) : (
                <ChevronDown className="mr-2 h-4 w-4" />
              )}
              {isExpanded ? "Hide requests" : "View requests"}
            </Button>
          )}
          {canCancelRide && (
            <Button variant="outline" onClick={onRequestEdit}>
              Edit ride
            </Button>
          )}
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

      {showExpandedSection && (
        <div className="mt-4 rounded-lg border bg-muted/20">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-semibold">
              {canManagePassengers ? "Passengers" : "Booking Requests"}
            </h2>
            {canManagePassengers && (
              <p className="mt-1 text-xs text-muted-foreground">
                Mark confirmed passengers as picked up or no-show while the ride
                is active.
              </p>
            )}
          </div>

          {bookings.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              No booking requests yet.
            </p>
          ) : ride.status === "IN_PROGRESS" &&
            confirmedBookings.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              No confirmed passengers are available to mark for this active
              ride.
            </p>
          ) : (
            <div className="space-y-3 p-4">
              {displayedBookings.map((booking) => (
                <PassengerRow
                  key={booking.id}
                  booking={booking}
                  canManagePassengers={canManagePassengers}
                  pickedUpLocally={locallyPickedUpBookingIds.has(booking.id)}
                  noShowLocally={locallyNoShowBookingIds.has(booking.id)}
                  pickupPending={pickupPendingBookingId === booking.id}
                  noShowPending={noShowPendingBookingId === booking.id}
                  isConfirming={isConfirming}
                  isDeclining={isDeclining}
                  isReviewing={isReviewing}
                  onConfirm={() => onConfirmBooking(booking.id)}
                  onDecline={() => onDeclineBooking(booking.id)}
                  onCreateReview={(rating) =>
                    onCreateReview(booking.id, rating)
                  }
                  onMarkPickedUp={() => onMarkPickedUp(booking.id)}
                  onMarkNoShow={() => onMarkNoShow(booking.id)}
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
  canManagePassengers,
  pickedUpLocally,
  noShowLocally,
  pickupPending,
  noShowPending,
  isConfirming,
  isDeclining,
  isReviewing,
  onConfirm,
  onDecline,
  onCreateReview,
  onMarkPickedUp,
  onMarkNoShow,
}: {
  booking: RideBooking;
  canManagePassengers: boolean;
  pickedUpLocally: boolean;
  noShowLocally: boolean;
  pickupPending: boolean;
  noShowPending: boolean;
  isConfirming: boolean;
  isDeclining: boolean;
  isReviewing: boolean;
  onConfirm: () => void;
  onDecline: () => void;
  onCreateReview: (rating: number) => void;
  onMarkPickedUp: () => void;
  onMarkNoShow: () => void;
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

  const canHandleThisBooking =
    canManagePassengers && !pickedUpLocally && !noShowLocally;

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-slate-900">
              {booking.passenger.name}
            </p>
            <Badge variant={bookingStatusVariants[booking.status]}>
              {bookingStatusLabels[booking.status]}
            </Badge>
            {pickedUpLocally && (
              <span className="text-xs text-emerald-700">Picked up</span>
            )}
            {noShowLocally && (
              <span className="text-xs text-destructive">Marked no-show</span>
            )}
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
          {booking.status === "PENDING" && !canManagePassengers && (
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

          {canManagePassengers && (
            <>
              {canHandleThisBooking ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pickupPending || noShowPending}
                    onClick={onMarkPickedUp}
                  >
                    <UserCheck className="mr-2 h-4 w-4" />
                    {pickupPending ? "Saving..." : "Picked up"}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={pickupPending || noShowPending}
                    onClick={onMarkNoShow}
                  >
                    <UserRoundX className="mr-2 h-4 w-4" />
                    {noShowPending ? "Saving..." : "No-show"}
                  </Button>
                </>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {pickedUpLocally
                    ? "Passenger marked as picked up."
                    : noShowLocally
                      ? "Passenger marked as no-show."
                      : "Already handled."}
                </span>
              )}
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
            {ride.originAddress} to {ride.destinationAddress}
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
