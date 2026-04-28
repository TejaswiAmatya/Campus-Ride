import { Link } from "react-router-dom";
import { CalendarCheck, Clock, MapPin } from "lucide-react";

import { StatusBadge } from "./StatusBadge";
import { useBookings } from "./hooks";

export function PassengerRideHistoryPage() {
  const { data: bookings, isLoading } = useBookings();
  const historyBookings = (bookings ?? []).filter(
    (booking) =>
      booking.status === "COMPLETED" ||
      booking.status === "CANCELLED" ||
      booking.ride.status === "COMPLETED" ||
      booking.ride.status === "CANCELLED",
  );

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Ride history</h1>
        <p className="text-sm text-muted-foreground">
          Review your completed and cancelled rides.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-lg border bg-muted"
            />
          ))}
        </div>
      ) : historyBookings.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <CalendarCheck className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-muted-foreground">
            No completed or cancelled rides yet.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {historyBookings.map((booking) => (
            <div key={booking.id} className="rounded-lg border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-center gap-2 truncate">
                    <MapPin className="h-4 w-4 shrink-0 text-primary" />
                    <p className="truncate font-medium">
                      {booking.ride.originAddress} to{" "}
                      {booking.ride.destinationAddress}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {new Date(booking.ride.departureTime).toLocaleString(
                        "en-GB",
                        {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )}
                    </span>
                    <span>{booking.seatsBooked} seat(s)</span>
                    <span className="font-medium text-foreground">
                      {booking.totalFare} NOK
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Driver: {booking.ride.driver.name}
                  </p>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-2">
                  <StatusBadge status={booking.status} />
                  <Link
                    to={`/rides/${booking.ride.id}`}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Open details
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
