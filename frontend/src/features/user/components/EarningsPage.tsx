import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarRange, Coins, ReceiptText, TrendingUp } from "lucide-react";

import { api } from "@/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type EarningsRide = {
  bookingId: string;
  rideId: string;
  rideDate: string;
  originAddress: string;
  destinationAddress: string;
  totalPrice: string;
  platformFee: string;
  driverPayout: string;
};

type EarningsResponse = {
  platformFeePercent: string;
  totals: {
    thisWeek: string;
    thisMonth: string;
    currency: string;
  };
  rides: EarningsRide[];
};

function formatCurrency(value: string, currency: string) {
  const amount = Number(value);
  return new Intl.NumberFormat("nb-NO", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatRideDate(value: string) {
  return new Intl.DateTimeFormat("nb-NO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function EarningsPage() {
  const { data, isLoading, isError, error } = useQuery<EarningsResponse>({
    queryKey: ["driverEarningsPage"],
    queryFn: async () => {
      const res = await api.get<{ data: EarningsResponse }>("/api/bookings/earnings");
      return res.data.data;
    },
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-xs font-medium text-mute">Driver</p>
          <h1 className="mt-1 font-display text-display-md text-foreground">Earnings</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-32 animate-pulse rounded-xl bg-soft" />
          <div className="h-32 animate-pulse rounded-xl bg-soft" />
        </div>
        <div className="h-72 animate-pulse rounded-xl bg-soft" />
      </div>
    );
  }

  if (isError) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to load driver earnings right now.";

    return (
      <div className="space-y-6">
        <div>
          <p className="text-xs font-medium text-mute">Driver</p>
          <h1 className="mt-1 font-display text-display-md text-foreground">Earnings</h1>
        </div>
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <p className="font-medium">Failed to load earnings.</p>
          <p className="mt-1 text-destructive/80">{message}</p>
        </div>
      </div>
    );
  }

  const earnings = data ?? {
    platformFeePercent: "10",
    totals: { thisWeek: "0", thisMonth: "0", currency: "NOK" },
    rides: [],
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-medium text-mute">Driver</p>
        <h1 className="mt-1 font-display text-display-md text-foreground">Earnings</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Review completed ride payouts and the current platform fee of{" "}
          <span className="font-medium text-foreground">
            {earnings.platformFeePercent}%
          </span>
          .
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <SummaryCard
          title="Earned This Week"
          value={formatCurrency(
            earnings.totals.thisWeek,
            earnings.totals.currency,
          )}
          subtitle="Completed rides since the start of this week"
          icon={<CalendarRange className="h-5 w-5" />}
        />
        <SummaryCard
          title="Earned This Month"
          value={formatCurrency(
            earnings.totals.thisMonth,
            earnings.totals.currency,
          )}
          subtitle="Completed rides since the first day of the month"
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>

      <Card className="rounded-xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-display-sm">Completed Ride Payouts</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Each completed booking shows the fare, platform fee, and your
              payout.
            </p>
          </div>
          <ReceiptText className="h-5 w-5 text-mute" />
        </CardHeader>
        <CardContent>
          {earnings.rides.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-soft p-6 text-sm text-muted-foreground">
              No completed rides yet, so there are no earnings to display.
            </div>
          ) : (
            <div className="space-y-3">
              {earnings.rides.map((ride) => (
                <div
                  key={ride.bookingId}
                  className="rounded-xl bg-soft p-4"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        {ride.originAddress} to {ride.destinationAddress}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatRideDate(ride.rideDate)}
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px]">
                      <AmountStat
                        label="Total fare"
                        value={formatCurrency(
                          ride.totalPrice,
                          earnings.totals.currency,
                        )}
                      />
                      <AmountStat
                        label="Platform fee"
                        value={formatCurrency(
                          ride.platformFee,
                          earnings.totals.currency,
                        )}
                      />
                      <AmountStat
                        label="Driver payout"
                        value={formatCurrency(
                          ride.driverPayout,
                          earnings.totals.currency,
                        )}
                        emphasize
                      />
                    </div>
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

function SummaryCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: ReactNode;
}) {
  return (
    <Card className="rounded-xl">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-base font-medium">{title}</CardTitle>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <div className="rounded-xl bg-soft p-2 text-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <p className="flex items-center gap-2 font-display text-display-md text-foreground">
          <Coins className="h-5 w-5 text-foreground" />
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function AmountStat({
  label,
  value,
  emphasize = false,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="rounded-lg bg-background px-3 py-2">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p
        className={`mt-1 text-sm font-semibold ${
          emphasize ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
