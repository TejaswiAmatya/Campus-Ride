import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  MapPin,
  Map,
  MessageSquareText,
  ShieldCheck,
  Ticket,
  Timer,
  UserCheck,
  UserRoundX,
  Users,
  Wallet,
} from "lucide-react";

import { api } from "@/api/client";
import { MapView } from "@/features/rides/components/MapView";
import { LeaveReviewSection } from "@/features/rides/components/LeaveReviewSection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RideChatPanel } from "@/features/chat/components/RideChatPanel";
import { StatusBadge } from "@/features/bookings/components/StatusBadge";
import {
  useBookings,
  useMarkBookingNoShow,
  useMarkBookingPickedUp,
} from "@/features/bookings/hooks/useBookings";
import type { BookingListItem } from "@/features/bookings/types";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  useDriverRideReviewPassengers,
  useUserReviews,
} from "@/features/user/hooks/useProfile";

import { DriverLocationLayer } from "./DriverLocationLayer";
import {
  useCancelRide,
  useDriverLocation,
  useDriverLocationEmitter,
  useFinishRide,
  useRide,
  useStartRide,
  useRideStatusListener,
} from "../hooks/useRides";

import type { Ride } from "../types";
import {
  fetchRoutePreview,
  formatRouteDistance,
  formatRouteDuration,
  type RoutePreview,
} from "../lib/routing";

export function RideDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: ride, isLoading, isError } = useRide(id);
  useRideStatusListener({ rideId: ride?.id, enabled: true });
  const { user } = useAuth();
  const [showReportForm, setShowReportForm] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [reason, setReason] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [routePreview, setRoutePreview] = useState<RoutePreview | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [locallyPickedUpBookingIds, setLocallyPickedUpBookingIds] = useState<
    string[]
  >([]);
  const [locallyNoShowBookingIds, setLocallyNoShowBookingIds] = useState<
    string[]
  >([]);

  const driverLocation = useDriverLocation(
    ride?.status === "IN_PROGRESS" ? ride.id : undefined,
  );
  const startRide = useStartRide();
  const finishRide = useFinishRide();
  const cancelRide = useCancelRide();
  const { data: driverReviews = [] } = useUserReviews(ride?.driver.id);
  const { data: driverBookings = [] } = useBookings({ asDriver: true });
  const { data: passengerBookings = [] } = useBookings();
  const { data: pendingDriverReviewPassengers = [] } =
    useDriverRideReviewPassengers(
      ride?.id,
      user?.id === ride?.driver.id ? user?.id : undefined,
      ride?.status,
    );

  const isDriverViewingOwnActiveRide =
    !!user &&
    !!ride &&
    user.id === ride.driver.id &&
    ride.status === "IN_PROGRESS";
  const isDriverViewingOwnScheduledRide =
    !!user &&
    !!ride &&
    user.id === ride.driver.id &&
    (ride.status === "OPEN" || ride.status === "FULL");
  const { isSharingLocation } = useDriverLocationEmitter(
    isDriverViewingOwnActiveRide ? ride.id : undefined,
  );
  const markBookingPickedUp = useMarkBookingPickedUp();
  const markBookingNoShow = useMarkBookingNoShow();

  useEffect(() => {
    if (!ride) {
      setRoutePreview(null);
      setRouteError(null);
      setIsLoadingRoute(false);
      return;
    }

    if (ride.routePolyline) {
      try {
        const parsed = JSON.parse(ride.routePolyline) as Array<
          [number, number]
        >;
        setRoutePreview({
          geometry: parsed,
          distanceMeters: (ride.routeDistanceKm ?? 0) * 1000,
          durationSeconds: (ride.routeDurationMinutes ?? 0) * 60,
        });
        setRouteError(null);
        setIsLoadingRoute(false);
        return;
      } catch {
        setRoutePreview(null);
      }
    }

    const controller = new AbortController();
    setIsLoadingRoute(true);
    setRouteError(null);

    void fetchRoutePreview(
      [
        { lat: ride.originLat, lng: ride.originLng },
        ...(ride.stops ?? []).map((stop) => ({ lat: stop.lat, lng: stop.lng })),
        { lat: ride.destinationLat, lng: ride.destinationLng },
      ],
      controller.signal,
    )
      .then((route) => {
        setRoutePreview(route);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setRoutePreview(null);
        setRouteError(
          error instanceof Error
            ? error.message
            : "Unable to load route preview.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoadingRoute(false);
        }
      });

    return () => controller.abort();
  }, [ride]);

  const canBook =
    !!user &&
    !!ride &&
    ride.status === "OPEN" &&
    ride.availableSeats > 0 &&
    user.id !== ride.driver.id &&
    !passengerBookings.some(
      (booking) =>
        booking.ride.id === ride.id &&
        (booking.status === "PENDING" || booking.status === "CONFIRMED"),
    );
  const passengerBookingForRide = useMemo<BookingListItem | null>(() => {
    if (!user || !ride || user.id === ride.driver.id) {
      return null;
    }

    return (
      passengerBookings.find((booking) => booking.ride.id === ride.id) ?? null
    );
  }, [passengerBookings, ride, user]);

  const reportableMembers = useMemo(() => {
    const participants = ride?.participants ?? [];
    return participants.filter((participant) => participant.id !== user?.id);
  }, [ride?.participants, user?.id]);

  const isPassengerParticipant = useMemo(() => {
    if (!user || !ride || user.id === ride.driver.id) {
      return false;
    }

    return passengerBookings.some(
      (booking) =>
        booking.ride.id === ride.id &&
        (booking.status === "CONFIRMED" || booking.status === "COMPLETED"),
    );
  }, [passengerBookings, ride, user]);
  const isConfirmedPassengerParticipant = useMemo(() => {
    if (!user || !ride || user.id === ride.driver.id) {
      return false;
    }

    return passengerBookings.some(
      (booking) =>
        booking.ride.id === ride.id && booking.status === "CONFIRMED",
    );
  }, [passengerBookings, ride, user]);
  const canAccessRideChat =
    !!user &&
    !!ride &&
    (user.id === ride.driver.id || isConfirmedPassengerParticipant);
  const rideChatParticipants = useMemo(() => {
    if (!ride) {
      return [];
    }

    const participants = [
      {
        id: ride.driver.id,
        name: ride.driver.name,
        avatarPath: ride.driver.avatarUrl ?? null,
      },
      ...(ride.participants ?? []).map((participant) => ({
        id: participant.id,
        name: participant.name,
        avatarPath: participant.avatarUrl ?? null,
      })),
    ];

    if (
      user &&
      !participants.some((participant) => participant.id === user.id)
    ) {
      participants.push({
        id: user.id,
        name: user.name,
        avatarPath: user.avatarPath ?? null,
      });
    }

    return participants;
  }, [ride, user]);

  const hasReviewedDriver = useMemo(() => {
    if (!user || !ride) {
      return false;
    }

    return driverReviews.some(
      (review) => review.rideId === ride.id && review.reviewer.id === user.id,
    );
  }, [driverReviews, ride, user]);

  const activeRideBookings = useMemo(
    () =>
      driverBookings.filter(
        (booking) =>
          booking.ride.id === ride?.id && booking.status === "CONFIRMED",
      ),
    [driverBookings, ride?.id],
  );
  const pickedUpSet = useMemo(
    () => new Set(locallyPickedUpBookingIds),
    [locallyPickedUpBookingIds],
  );
  const noShowSet = useMemo(
    () => new Set(locallyNoShowBookingIds),
    [locallyNoShowBookingIds],
  );

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="animate-pulse text-muted-foreground">
          Loading ride details...
        </p>
      </div>
    );
  }

  if (isError || !ride) {
    return (
      <div className="space-y-4 rounded-xl border border-dashed border-border p-8 text-center">
        <p className="text-muted-foreground">
          Ride details could not be loaded.
        </p>
        <Link
          to="/rides"
          className="text-sm font-medium text-primary hover:underline"
        >
          Back to search
        </Link>
      </div>
    );
  }

  const canSubmitReport =
    selectedUserId && reason.trim().length >= 10 && !isSubmitting;
  const showLeaveReviewSection =
    !!user &&
    ride.status === "COMPLETED" &&
    isPassengerParticipant &&
    !hasReviewedDriver;
  const showDriverReviewSection =
    !!user &&
    ride.status === "COMPLETED" &&
    user.id === ride.driver.id &&
    pendingDriverReviewPassengers.length > 0;
  const showCompletedRideMemberActions =
    !!user &&
    ride.status === "COMPLETED" &&
    (isPassengerParticipant || user.id === ride.driver.id);

  const handleReportSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedUserId) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await api.post("/api/reports", {
        targetUserId: selectedUserId,
        targetRideId: ride.id,
        reason: reason.trim(),
      });
      setReason("");
      setSelectedUserId("");
      setShowReportForm(false);
    } catch (error) {
      void error;
      setSubmitError("Unable to submit report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-2">
        <h1 className="font-display text-display-lg text-foreground">
          {ride.originAddress} to {ride.destinationAddress}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-muted-foreground">
            Driver: {ride.driver.name}
            {ride.driver.vehicle
              ? ` - ${ride.driver.vehicle.colour} ${ride.driver.vehicle.make} ${ride.driver.vehicle.model}`
              : ""}
          </p>
          {isSharingLocation && (
            <Badge variant="secondary" className="gap-1.5">
              <span
                className="h-2 w-2 rounded-full bg-success"
                aria-hidden="true"
              />
              Sharing location
            </Badge>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <MapView
          height="h-80"
          routePath={routePreview?.geometry ?? []}
          markers={[
            {
              position: [ride.originLat, ride.originLng],
              label: `Pickup: ${ride.originAddress}`,
              type: "origin",
            },
            {
              position: [ride.destinationLat, ride.destinationLng],
              label: `Dropoff: ${ride.destinationAddress}`,
              type: "destination",
            },
          ]}
        >
          <DriverLocationLayer location={driverLocation} />
        </MapView>
        <div className="grid gap-3 rounded-xl bg-soft p-4 sm:grid-cols-3">
          <RouteMeta
            icon={<Map className="h-4 w-4" />}
            label="Distance"
            value={
              routePreview
                ? formatRouteDistance(routePreview.distanceMeters)
                : isLoadingRoute
                  ? "Loading..."
                  : "Unavailable"
            }
          />
          <RouteMeta
            icon={<Timer className="h-4 w-4" />}
            label="Drive time"
            value={
              routePreview
                ? formatRouteDuration(routePreview.durationSeconds)
                : isLoadingRoute
                  ? "Loading..."
                  : "Unavailable"
            }
          />
          <div className="rounded-xl bg-background px-3 py-3 text-sm text-muted-foreground">
            {routeError
              ? routeError
              : routePreview
                ? "Route preview is based on the current OSRM driving path."
                : "Route preview will appear here when available."}
          </div>
        </div>
      </div>

      <div className="grid gap-4 rounded-xl bg-soft p-5 sm:grid-cols-4">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Departure
          </p>
          <p className="flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4 text-primary" />
            {new Date(ride.departureTime).toLocaleString()}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Seats
          </p>
          <p className="flex items-center gap-2 text-sm font-medium">
            <Users className="h-4 w-4 text-primary" />
            {ride.availableSeats} available of {ride.totalSeats}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Price
          </p>
          <p className="text-sm font-medium">
            {ride.pricePerSeat} NOK per seat
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Ride status
          </p>
          <p className="text-sm font-medium">{ride.status.replace("_", " ")}</p>
        </div>
      </div>

      {canBook && (
        <div className="overflow-hidden rounded-xl bg-soft">
          <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <Ticket className="h-4 w-4" />
                Reserve your seat
              </div>
              <div>
                <h2 className="text-lg font-semibold">
                  Book this ride in a couple of taps
                </h2>
                <p className="text-sm text-muted-foreground">
                  {ride.availableSeats} seat
                  {ride.availableSeats === 1 ? "" : "s"} left at{" "}
                  {ride.pricePerSeat} NOK each.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-success" />
                  Driver-reviewed flow
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  Instant seat request
                </span>
              </div>
            </div>
            <Button
              asChild
              size="lg"
              className="min-w-[180px] justify-center text-base"
            >
              <Link to={`/rides/${ride.id}/book`}>
                Book Ride
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      )}

      {(isDriverViewingOwnScheduledRide || isDriverViewingOwnActiveRide) && (
        <section className="rounded-xl bg-primary p-5 text-primary-foreground">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-medium text-mute">
                Driver controls
              </p>
              <h2 className="text-xl font-semibold">
                {ride.status === "IN_PROGRESS"
                  ? "Finish this ride when everyone reaches the destination"
                  : "Start when pickup is underway, or cancel if the trip cannot happen"}
              </h2>
              <p className="max-w-2xl text-sm text-mute">
                These actions update rider history and booking status in real
                time.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {isDriverViewingOwnScheduledRide && (
                <>
                  <Button
                    onClick={() => startRide.mutate(ride.id)}
                    disabled={startRide.isPending || cancelRide.isPending}
                    variant="secondary"
                  >
                    {startRide.isPending ? "Starting..." : "Start ride"}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => cancelRide.mutate(ride.id)}
                    disabled={cancelRide.isPending || startRide.isPending}
                  >
                    {cancelRide.isPending ? "Cancelling..." : "Cancel ride"}
                  </Button>
                </>
              )}
              {isDriverViewingOwnActiveRide && (
                <Button
                  onClick={() => finishRide.mutate(ride.id)}
                  disabled={finishRide.isPending}
                  variant="secondary"
                >
                  {finishRide.isPending ? "Finishing..." : "Finish ride"}
                </Button>
              )}
            </div>
          </div>
        </section>
      )}

      <div className="grid gap-4 rounded-xl bg-soft p-5 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
            Pickup
          </p>
          <p className="flex items-start gap-2 text-sm">
            <MapPin className="mt-0.5 h-4 w-4 text-foreground" />
            {ride.originAddress}
          </p>
        </div>
        <div>
          <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
            Dropoff
          </p>
          <p className="flex items-start gap-2 text-sm">
            <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
            {ride.destinationAddress}
          </p>
        </div>
      </div>

      {passengerBookingForRide && (
        <section className="rounded-xl bg-background p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={passengerBookingForRide.status} />
                <span className="text-xs font-medium text-mute">
                  Booking {passengerBookingForRide.id.slice(0, 8)}
                </span>
              </div>
              <h2 className="font-display text-display-sm text-foreground">
                Your booking for this ride
              </h2>
              <p className="text-sm text-muted-foreground">
                This ride page now includes your booking details, so you do not
                need a separate booking page.
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to={`/profile/${ride.driver.id}`}>View driver profile</Link>
            </Button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <RouteMeta
              icon={<Users className="h-4 w-4" />}
              label="Seats booked"
              value={`${passengerBookingForRide.seatsBooked}`}
            />
            <RouteMeta
              icon={<Wallet className="h-4 w-4" />}
              label="Charged"
              value={`${passengerBookingForRide.refund.remainingCharged} NOK`}
            />
            <RouteMeta
              icon={<CheckCircle2 className="h-4 w-4" />}
              label="Payment"
              value={passengerBookingForRide.payment.status}
            />
            <RouteMeta
              icon={<Ticket className="h-4 w-4" />}
              label="Refunded"
              value={`${passengerBookingForRide.refund.amount} NOK`}
            />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl bg-soft px-4 py-4 text-sm text-foreground">
              <p className="text-xs font-medium text-mute">
                Pickup
              </p>
              <p className="mt-2">
                {passengerBookingForRide.pickup?.address ?? ride.originAddress}
              </p>
              <p className="mt-4 text-xs font-medium text-mute">
                Dropoff
              </p>
              <p className="mt-2">
                {passengerBookingForRide.dropoff?.address ??
                  ride.destinationAddress}
              </p>
            </div>

            <div className="rounded-xl bg-soft px-4 py-4 text-sm text-foreground">
              <p className="text-xs font-medium text-mute">
                Refund policy
              </p>
              <p className="mt-2 leading-6">
                Full refund if cancelled more than{" "}
                {
                  passengerBookingForRide.cancellation.rules
                    .fullRefundBeforeHours
                }{" "}
                hours before departure,{" "}
                {
                  passengerBookingForRide.cancellation.rules
                    .partialRefundPercent
                }
                % refund within that final window, and{" "}
                {passengerBookingForRide.cancellation.rules.noShowRefundPercent}
                % refund for no-shows.
              </p>
              {passengerBookingForRide.messageToDriver && (
                <>
                  <p className="mt-4 flex items-center gap-2 text-xs font-medium text-mute">
                    <MessageSquareText className="h-4 w-4 text-foreground" />
                    Your message to the driver
                  </p>
                  <p className="mt-2 leading-6">
                    {passengerBookingForRide.messageToDriver}
                  </p>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {canAccessRideChat && user && (
        <RideChatPanel
          rideId={ride.id}
          currentUserId={user.id}
          knownParticipants={rideChatParticipants}
        />
      )}

      {isDriverViewingOwnActiveRide && (
        <section className="rounded-xl bg-background p-5">
          <div className="space-y-1">
            <p className="text-sm font-semibold">Passengers</p>
            <p className="text-xs text-muted-foreground">
              Mark confirmed passengers as picked up or no-show while this ride
              is active.
            </p>
          </div>

          <div className="mt-4 space-y-3">
            {activeRideBookings.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No confirmed passengers are available to mark for this active
                ride.
              </p>
            ) : (
              activeRideBookings.map((booking) => {
                const pickedUpLocally = pickedUpSet.has(booking.id);
                const noShowLocally = noShowSet.has(booking.id);
                const canHandleBooking = !pickedUpLocally && !noShowLocally;

                return (
                  <div
                    key={booking.id}
                    className="flex flex-col gap-3 rounded-xl bg-soft p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        {booking.passenger?.name ?? "Passenger"}
                      </p>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span>{booking.seatsBooked} seat(s)</span>
                        <span>Status: {booking.status}</span>
                        {pickedUpLocally && (
                          <span className="text-success">Picked up</span>
                        )}
                        {noShowLocally && (
                          <span className="text-destructive">
                            Marked no-show
                          </span>
                        )}
                      </div>
                    </div>

                    {canHandleBooking ? (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={
                            markBookingPickedUp.isPending ||
                            markBookingNoShow.isPending
                          }
                          onClick={() =>
                            markBookingPickedUp.mutate(booking.id, {
                              onSuccess: () =>
                                setLocallyPickedUpBookingIds((current) =>
                                  current.includes(booking.id)
                                    ? current
                                    : [...current, booking.id],
                                ),
                            })
                          }
                        >
                          <UserCheck className="mr-2 h-4 w-4" />
                          {markBookingPickedUp.isPending &&
                          markBookingPickedUp.variables === booking.id
                            ? "Saving..."
                            : "Picked up"}
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          disabled={
                            markBookingPickedUp.isPending ||
                            markBookingNoShow.isPending
                          }
                          onClick={() =>
                            markBookingNoShow.mutate(booking.id, {
                              onSuccess: () =>
                                setLocallyNoShowBookingIds((current) =>
                                  current.includes(booking.id)
                                    ? current
                                    : [...current, booking.id],
                                ),
                            })
                          }
                        >
                          <UserRoundX className="mr-2 h-4 w-4" />
                          {markBookingNoShow.isPending &&
                          markBookingNoShow.variables === booking.id
                            ? "Saving..."
                            : "No-show"}
                        </Button>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {pickedUpLocally
                          ? "Passenger already marked as picked up."
                          : noShowLocally
                            ? "Passenger already marked as no-show."
                            : "Already handled."}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>
      )}

      {showLeaveReviewSection && (
        <div className="rounded-xl bg-soft p-2">
          <LeaveReviewSection
            rideId={ride.id}
            revieweeId={ride.driver.id}
            revieweeName={ride.driver.name}
            revieweeProfileHref={`/profile/${ride.driver.id}`}
            title="Leave a Review"
            description="Your feedback helps future passengers understand what the ride experience is actually like."
          />
        </div>
      )}

      {showDriverReviewSection && (
        <section className="space-y-4 rounded-xl bg-background p-6">
          <div className="space-y-1">
            <p className="text-xs font-medium text-mute">
              Completed ride follow-up
            </p>
            <h2 className="font-display text-display-md text-foreground">
              Review your passengers
            </h2>
            <p className="text-sm text-muted-foreground">
              Leave one short review for each confirmed passenger from this
              completed ride.
            </p>
          </div>

          <div className="space-y-5">
            {pendingDriverReviewPassengers.map((passenger) => (
              <div key={passenger.id} className="space-y-3">
                <div className="rounded-xl bg-soft px-4 py-3 text-sm text-muted-foreground">
                  Passenger:{" "}
                  <Link
                    to={`/profile/${passenger.id}`}
                    className="font-medium text-foreground underline underline-offset-4 transition hover:text-hairline-mid"
                  >
                    {passenger.name}
                  </Link>
                </div>
                <LeaveReviewSection
                  rideId={ride.id}
                  revieweeId={passenger.id}
                  revieweeName={passenger.name}
                  revieweeProfileHref={`/profile/${passenger.id}`}
                  title={`Review ${passenger.name}`}
                  description="Keep it practical and specific so future riders and drivers get useful context."
                  submitLabel={`Submit review for ${passenger.name}`}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {showCompletedRideMemberActions && (
        <div className="rounded-xl bg-background p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">Report a ride member</p>
              <p className="text-xs text-muted-foreground">
                Share concerns about someone in this completed ride.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowReportForm((value) => !value)}
            >
              {showReportForm ? "Cancel" : "Report"}
            </Button>
          </div>

          {showReportForm && (
            <form className="mt-4 space-y-4" onSubmit={handleReportSubmit}>
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Select member
                </label>
                <select
                  className="flex h-12 w-full rounded-md border-0 bg-soft px-4 py-4 text-base"
                  value={selectedUserId}
                  onChange={(event) => setSelectedUserId(event.target.value)}
                >
                  <option value="">Choose a rider...</option>
                  {reportableMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.id === ride.driver.id
                        ? `Driver: ${member.name}`
                        : member.name}
                    </option>
                  ))}
                </select>
                {reportableMembers.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No other members available.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Reason
                </label>
                <textarea
                  className="min-h-[120px] flex h-12 w-full rounded-md border-0 bg-soft px-4 py-4 text-base"
                  placeholder="Share what happened and any details that might help us."
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Minimum 10 characters.
                </p>
              </div>

              {submitError && (
                <p className="text-sm text-destructive">{submitError}</p>
              )}

              <Button
                type="submit"
                disabled={!canSubmitReport || reportableMembers.length === 0}
              >
                {isSubmitting ? "Submitting..." : "Submit report"}
              </Button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

function RouteMeta({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-background px-3 py-3">
      <div className="flex items-center gap-2 text-xs font-medium text-mute">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-2 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
