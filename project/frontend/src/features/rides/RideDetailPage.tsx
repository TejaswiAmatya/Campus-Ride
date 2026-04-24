import { Link, useParams } from "react-router-dom";
import { useMemo, useState } from "react";
import { Clock, MapPin, Users } from "lucide-react";
import { MapView } from "@/components/MapView";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useRide } from "./hooks";
import { api } from "@/api/client";

export function RideDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: ride, isLoading, isError } = useRide(id);
  const { user } = useAuth();
  const [showReportForm, setShowReportForm] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [reason, setReason] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canBook =
    !!user &&
    !!ride &&
    ride.status === "OPEN" &&
    ride.availableSeats > 0 &&
    user.id !== ride.driver.id;

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

  const reportableMembers = useMemo(() => {
    const participants = ride.participants ?? [];
    return participants.filter((participant) => participant.id !== user?.id);
  }, [ride.participants, user?.id]);

  const canSubmitReport =
    selectedUserId && reason.trim().length >= 10 && !isSubmitting;

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
        <p className="text-sm text-muted-foreground">
          Driver: {ride.driver.name}
          {ride.driver.vehicle
            ? ` • ${ride.driver.vehicle.colour} ${ride.driver.vehicle.make} ${ride.driver.vehicle.model}`
            : ""}
        </p>
      </div>

      <MapView
        height="h-80"
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
      />

      <div className="grid gap-4 rounded-lg border p-5 sm:grid-cols-3">
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
      </div>

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
