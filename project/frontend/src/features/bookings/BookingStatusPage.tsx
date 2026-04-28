import { Link, Navigate, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";

import { useBooking } from "./hooks";

export function BookingStatusPage() {
  const { id } = useParams<{ id: string }>();
  const { data: booking, isLoading, isError } = useBooking(id);

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

  return <Navigate to={`/rides/${booking.ride.id}`} replace />;
}
