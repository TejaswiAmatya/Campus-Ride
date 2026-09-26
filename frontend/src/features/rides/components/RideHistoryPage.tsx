import { Link } from "react-router-dom";
import { CalendarClock, History, Users, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { useMyRides } from "../hooks/useRides";

function formatRideDate(value: string) {
  return new Intl.DateTimeFormat("nb-NO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function RideHistoryPage() {
  const { data: rides = [], isLoading } = useMyRides();
  const completedRides = rides.filter((ride) => ride.status === "COMPLETED");

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-slate-400">
          Driver
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-800">
          Ride history
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Review every completed ride and reopen the full ride details when you
          need them.
        </p>
      </div>

      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-xl">Completed rides</CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              Finished rides are moved here from My rides.
            </p>
          </div>
          <History className="h-5 w-5 text-slate-400" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-32 animate-pulse rounded-xl border bg-muted/40" />
          ) : completedRides.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
              No completed rides yet.
            </div>
          ) : (
            <div className="space-y-3">
              {completedRides.map((ride) => (
                <div
                  key={ride.id}
                  className="rounded-xl border border-slate-200 bg-white p-4"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-slate-800">
                        {ride.originAddress} to {ride.destinationAddress}
                      </p>
                      <div className="flex flex-wrap gap-3 text-sm text-slate-500">
                        <span className="flex items-center gap-2">
                          <CalendarClock className="h-4 w-4" />
                          {formatRideDate(ride.departureTime)}
                        </span>
                        <span className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          {ride.stats?.completedPassengers ?? 0} passengers
                        </span>
                        <span className="flex items-center gap-2">
                          <Wallet className="h-4 w-4" />
                          {ride.stats?.completedEarnings ?? "0.00"} NOK earned
                        </span>
                      </div>
                    </div>

                    <Button asChild variant="outline">
                      <Link to={`/driver/rides/${ride.id}`}>Open details</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
