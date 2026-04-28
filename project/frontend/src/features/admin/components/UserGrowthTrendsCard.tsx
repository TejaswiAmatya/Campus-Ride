import { useMemo, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { ArrowDownRight, ArrowUpRight, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type UserGrowthPeriod,
  useUserGrowthAnalytics,
} from "../hooks/useUserGrowthAnalytics";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
);

const PERIOD_OPTIONS: Array<{ value: UserGrowthPeriod; label: string }> = [
  { value: "daily", label: "30 Days" },
  { value: "weekly", label: "12 Weeks" },
  { value: "monthly", label: "12 Months" },
];

function formatPeriodLabel(periodStart: string, period: UserGrowthPeriod): string {
  const date = new Date(periodStart);
  if (period === "daily") {
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  if (period === "weekly") {
    return `Wk ${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
  }

  return date.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

function formatRatio(drivers: number, passengers: number): string {
  if (passengers === 0) {
    return drivers > 0 ? `${drivers}:0` : "0:0";
  }

  const ratio = drivers / passengers;
  return `${ratio.toFixed(2)} : 1`;
}

export function UserGrowthTrendsCard() {
  const [period, setPeriod] = useState<UserGrowthPeriod>("daily");
  const {
    data,
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
  } = useUserGrowthAnalytics();

  const selectedSeries = useMemo(() => {
    if (!data) return [];
    return data[period];
  }, [data, period]);

  const labels = useMemo(
    () => selectedSeries.map((item) => formatPeriodLabel(item.periodStart, period)),
    [selectedSeries, period],
  );

  const totalUsersThisMonth = data?.monthly.at(-1)?.totalNewUsers ?? 0;
  const previousMonthUsers = data?.monthly.at(-2)?.totalNewUsers ?? 0;
  const monthChangePct =
    previousMonthUsers === 0
      ? totalUsersThisMonth > 0
        ? 100
        : 0
      : ((totalUsersThisMonth - previousMonthUsers) / previousMonthUsers) * 100;
  const isMonthGrowthPositive = monthChangePct >= 0;

  const isEmpty = selectedSeries.length === 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">User Growth Trends</CardTitle>
          <div className="h-4 w-56 animate-pulse rounded bg-muted" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-20 animate-pulse rounded-md border bg-muted" />
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-md border bg-muted" />
          <div className="h-64 animate-pulse rounded-md border bg-muted" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">User Growth Trends</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            {error instanceof Error
              ? error.message
              : "Unable to load user growth analytics right now."}
          </p>
          <Button
            variant="outline"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="w-fit"
          >
            {isFetching ? "Retrying..." : "Retry"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data || isEmpty) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">User Growth Trends</CardTitle>
          <p className="text-sm text-muted-foreground">
            No user data available yet. Invite your first riders to get started.
          </p>
        </CardHeader>
      </Card>
    );
  }

  const lineData = {
    labels,
    datasets: [
      {
        label: "Drivers",
        data: selectedSeries.map((item) => item.driverCount),
        borderColor: "#0d9488",
        backgroundColor: "rgba(13, 148, 136, 0.20)",
        tension: 0.3,
        fill: false,
      },
      {
        label: "Passengers",
        data: selectedSeries.map((item) => item.passengerCount),
        borderColor: "#2563eb",
        backgroundColor: "rgba(37, 99, 235, 0.20)",
        tension: 0.3,
        fill: false,
      },
    ],
  };

  const commonAnimation = {
    duration: 600,
    easing: "easeOutQuart" as const,
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: commonAnimation,
    plugins: {
      legend: { position: "top" as const },
    },
  };

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-base">User Growth Trends</CardTitle>
            <p className="text-sm text-muted-foreground">
              Registrations by role with cumulative and net growth signals.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {PERIOD_OPTIONS.map((option) => (
              <Button
                key={option.value}
                variant={period === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => setPeriod(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-md border p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Total Users This Month
            </p>
            <p className="mt-2 text-2xl font-semibold">{totalUsersThisMonth}</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Change vs Last Month
            </p>
            <div
              className={`mt-2 flex items-center gap-1 text-2xl font-semibold ${
                isMonthGrowthPositive ? "text-green-600" : "text-destructive"
              }`}
            >
              {isMonthGrowthPositive ? (
                <ArrowUpRight className="h-5 w-5" />
              ) : (
                <ArrowDownRight className="h-5 w-5" />
              )}
              {Math.abs(monthChangePct).toFixed(1)}%
            </div>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Drivers to Passengers
            </p>
            <div className="mt-2 flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <p className="text-2xl font-semibold">
                {formatRatio(data.totals.drivers, data.totals.passengers)}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="h-72 w-full">
          <Line data={lineData} options={lineOptions} />
        </div>
      </CardContent>
    </Card>
  );
}
