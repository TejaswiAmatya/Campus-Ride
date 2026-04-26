import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Clock,
  Map,
  MapPin,
  ShieldCheck,
  Ticket,
  Timer,
  Users,
} from "lucide-react";
import { MapView } from "@/components/MapView";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import {
  useDriverRideReviewPassengers,
  useUserReviews,
} from "@/hooks/useProfile";
import { api } from "@/api/client";
import { DriverLocationLayer } from "./components/DriverLocationLayer";
import { useDriverLocation, useDriverLocationEmitter, useRide } from "./hooks";
import {
  fetchRoutePreview,
  formatRouteDistance,
  formatRouteDuration,
  type RoutePreview,
} from "./routing";
import { useQuery } from "@tanstack/react-query";
import { LeaveReviewSection } from "@/components/LeaveReviewSection";

export function RideDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: ride, isLoading, isError } = useRide(id);
  const { user } = useAuth();
  const [showReportForm, setShowReportForm] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [reason, setReason] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [routePreview, setRoutePreview] = useState<RoutePreview | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const driverLocation = useDriverLocation(
    ride?.status === "IN_PROGRESS" ? ride.id : undefined,
  );
  const { data: driverReviews = [] } = useUserReviews(ride?.driver.id);
  const { data: myBookings = [] } = useQuery({
    queryKey: ["bookings", "ride-detail-review-check"],
    queryFn: async () => {
      const res = await api.get<{
        data: Array<{
          id: string;
          status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
          ride: { id: string };
        }>;
      }>("/api/bookings");
      return res.data.data ?? [];
    },
    enabled: !!user,
  });
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
  const { isSharingLocation } = useDriverLocationEmitter(
    isDriverViewingOwnActiveRide ? ride?.id : undefined,
  );

  useEffect(() => {
    if (!ride) {
      setRoutePreview(null);
      setRouteError(null);
      setIsLoadingRoute(false);
      return;
    }

    if (ride.routePolyline) {
      try {
        const parsed = JSON.parse(ride.routePolyline) as Array<[number, number]>;
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
    user.id !== ride.driver.id;

  const reportableMembers = useMemo(() => {
    const participants = ride?.participants ?? [];
    return participants.filter((participant) => participant.id !== user?.id);
  }, [ride?.participants, user?.id]);

  const isPassengerParticipant = useMemo(() => {
    if (!user || !ride || user.id === ride.driver.id) {
      return false;
    }

    return myBookings.some(
      (booking) =>
        booking.ride.id === ride.id &&
        (booking.status === "CONFIRMED" || booking.status === "COMPLETED"),
    );
  }, [myBookings, ride, user]);

  const hasReviewedDriver = useMemo(() => {
    if (!user || !ride) {
      return false;
    }

    return driverReviews.some(
      (review) => review.rideId === ride.id && review.reviewer.id === user.id,
    );
  }, [driverReviews, ride, user]);

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="animate-pulse text-muted-foreground">
          Loading ride details…
        </p>
      </div>
    );
  }

  if (isError || !ride) {
    return (
      <div className="space-y-4 rounded-lg border border-dashed p-8 text-center">
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

  const handleReportSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    if (!ride || !selectedUserId) {
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
        <h1 className="text-2xl font-bold">
          {ride.originAddress} → {ride.destinationAddress}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-muted-foreground">
            Driver: {ride.driver.name}
            {ride.driver.vehicle
              ? ` • ${ride.driver.vehicle.colour} ${ride.driver.vehicle.make} ${ride.driver.vehicle.model}`
              : ""}
          </p>
          {isSharingLocation && (
            <Badge variant="secondary" className="gap-1.5">
              <span
                className="h-2 w-2 rounded-full bg-emerald-500"
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
        <div className="grid gap-3 rounded-2xl border bg-slate-50 p-4 sm:grid-cols-3">
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
          <div className="rounded-xl border bg-white px-3 py-3 text-sm text-slate-600">
            {routeError
              ? routeError
              : routePreview
                ? "Route preview is based on the current OSRM driving path."
                : "Route preview will appear here when available."}
          </div>
        </div>
      </div>

      <div className="grid gap-4 rounded-lg border p-5 sm:grid-cols-4">
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
        <div className="overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-background">
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
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
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

      <div className="grid gap-4 rounded-lg border p-5 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
            Pickup
          </p>
          <p className="flex items-start gap-2 text-sm">
            <MapPin className="mt-0.5 h-4 w-4 text-green-600" />
            {ride.originAddress}
          </p>
        </div>
        <div>
          <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
            Dropoff
          </p>
          <p className="flex items-start gap-2 text-sm">
            <MapPin className="mt-0.5 h-4 w-4 text-red-500" />
            {ride.destinationAddress}
          </p>
        </div>
      </div>

      {showLeaveReviewSection && (
        <div className="rounded-[32px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.9),rgba(255,255,255,0.98))] p-2 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.45)]">
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

      {!!user &&
        ride.status !== "COMPLETED" &&
        (isPassengerParticipant || user.id === ride.driver.id) && (
          <section className="rounded-[30px] border border-amber-200 bg-[linear-gradient(180deg,rgba(255,251,235,0.98),rgba(255,255,255,0.96))] p-6 shadow-[0_18px_50px_-42px_rgba(120,53,15,0.35)]">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">
              Reviews locked
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-950">
              Ride must be completed before reviews are available.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Once this ride reaches completed status, review forms will appear
              here for eligible riders and the driver.
            </p>
          </section>
        )}

      {showDriverReviewSection && (
        <section className="space-y-4 rounded-[32px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.92))] p-6 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.45)]">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Completed ride follow-up
            </p>
            <h2 className="text-2xl font-semibold text-slate-950">
              Review your passengers
            </h2>
            <p className="text-sm text-slate-600">
              Leave one short review for each confirmed passenger from this
              completed ride.
            </p>
          </div>

          <div className="space-y-5">
            {pendingDriverReviewPassengers.map((passenger) => (
              <div key={passenger.id} className="space-y-3">
                <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-600">
                  Passenger:{" "}
                  <Link
                    to={`/profile/${passenger.id}`}
                    className="font-medium text-slate-900 underline decoration-sky-300 underline-offset-4 transition hover:text-sky-700"
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

      <div className="rounded-lg border p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Report a ride member</p>
            <p className="text-xs text-muted-foreground">
              Share concerns about someone in this ride.
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
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedUserId}
                onChange={(event) => setSelectedUserId(event.target.value)}
              >
                <option value="">Choose a rider…</option>
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
                className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
              {isSubmitting ? "Submitting…" : "Submit report"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

function RouteMeta({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border bg-white px-3 py-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-2 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}
