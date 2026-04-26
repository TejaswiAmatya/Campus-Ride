import {
  LayoutDashboard,
  Users,
  Car,
  BookOpen,
  DollarSign,
  FileWarning,
  CheckCircle,
  XCircle,
  TrendingUp,
  AlertCircle,
  Settings,
} from "lucide-react";
import { Link } from "react-router-dom";
import { StatsCard } from "./StatsCard";
import { useAdminStats } from "@/features/admin/useAdminStats";
import { Button } from "@/components/ui/button";

export function AdminDashboard() {
  const {
    data: stats,
    isLoading: statsLoading,
    isError: hasStatsError,
    error: statsError,
    refetch: refetchStats,
    isFetching: statsFetching,
  } = useAdminStats();

  if (statsLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 rounded-lg border animate-pulse bg-muted"
            />
          ))}
        </div>
      </div>
    );
  }

  if (hasStatsError) {
    const statsErrorMessage =
      statsError instanceof Error
        ? statsError.message
        : "Unable to load admin dashboard statistics.";

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        </div>

        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 text-destructive" />
            <div className="space-y-3">
              <div>
                <p className="font-medium text-destructive">
                  Failed to load dashboard statistics.
                </p>
                <p className="text-destructive/80">{statsErrorMessage}</p>
              </div>
              <Button
                onClick={() => void refetchStats()}
                disabled={statsFetching}
                variant="outline"
              >
                {statsFetching ? "Retrying…" : "Retry"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        </div>
        <Button asChild variant="outline">
          <Link to="/admin/settings">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Link>
        </Button>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Users
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatsCard
            icon={<Users className="text-primary" />}
            title="Total Drivers"
            value={stats?.totalDrivers ?? 0}
          />
          <StatsCard
            icon={<Users className="text-primary" />}
            title="Total Passengers"
            value={stats?.totalPassengers ?? 0}
          />
          <StatsCard
            icon={<TrendingUp className="text-green-600" />}
            title="New Users (Month)"
            value={stats?.newUsersThisMonth ?? 0}
          />
          <StatsCard
            icon={<BookOpen className="text-yellow-600" />}
            title="Pending Applications"
            value={stats?.pendingDrivers ?? 0}
          />
        </div>
      </section>

      {/* Rides */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Rides
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatsCard
            icon={<Car className="text-primary" />}
            title="Active Now"
            value={stats?.activeRides ?? 0}
          />
          <StatsCard
            icon={<Car className="text-blue-600" />}
            title="Today"
            value={stats?.bookingsToday ?? 0}
          />
          <StatsCard
            icon={<Car className="text-blue-600" />}
            title="This Week"
            value={stats?.bookingsThisWeek ?? 0}
          />
          <StatsCard
            icon={<Car className="text-blue-600" />}
            title="This Month"
            value={stats?.bookingsThisMonth ?? 0}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <StatsCard
            icon={<CheckCircle className="text-green-600" />}
            title="Completed"
            value={stats?.ridesCompleted ?? 0}
          />
          <StatsCard
            icon={<XCircle className="text-destructive" />}
            title="Cancelled"
            value={stats?.ridesCancelled ?? 0}
          />
        </div>
      </section>

      {/* Revenue & Reports */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Revenue & Safety
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <StatsCard
            icon={<DollarSign className="text-primary" />}
            title="Total Revenue"
            value={`${stats?.totalRevenue ?? 0} NOK`}
          />
          <StatsCard
            icon={<FileWarning className="text-destructive" />}
            title="Open Reports"
            value={stats?.openReports ?? 0}
          />
        </div>
      </section>
      {/* TODO Sprint 2: Reports table */}
      {/* TODO Sprint 2: Config editor (platform fee) */}
    </div>
  );
}
