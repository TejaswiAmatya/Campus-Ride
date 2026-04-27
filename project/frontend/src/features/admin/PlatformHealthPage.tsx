import { Link } from "react-router-dom";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { usePlatformHealth } from "./usePlatformHealth";
import type { PlatformHealthReason, PlatformHealthUser } from "./types";

const reasonBadgeClasses: Record<PlatformHealthReason, string> = {
  "High Cancellation Rate":
    "border-orange-200 bg-orange-50 text-orange-700",
  "Multiple Reports Received": "border-red-200 bg-red-50 text-red-700",
  "Low Average Rating": "border-yellow-200 bg-yellow-50 text-yellow-700",
  "No-Show Pattern": "border-purple-200 bg-purple-50 text-purple-700",
  "New Account Activity Spike": "border-blue-200 bg-blue-50 text-blue-700",
};

function getRiskScoreClassName(score: number) {
  if (score > 60) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (score >= 30) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-green-200 bg-green-50 text-green-700";
}

function formatJoinedDate(value: string) {
  return new Date(value).toLocaleDateString();
}

function formatPlatformHealthStats(user: PlatformHealthUser) {
  const stats: string[] = [];

  if (user.cancellationRate !== null) {
    stats.push(`${Math.round(user.cancellationRate * 100)}% cancelled`);
  }
  if (user.reportsReceived !== null) {
    stats.push(
      `${user.reportsReceived} report${user.reportsReceived === 1 ? "" : "s"}`,
    );
  }
  if (user.avgRating !== null) {
    stats.push(`${user.avgRating.toFixed(1)} average rating`);
  }
  if (user.noShowCount !== null) {
    stats.push(
      `${user.noShowCount} stale ride${user.noShowCount === 1 ? "" : "s"}`,
    );
  }

  return stats.join(" · ");
}

function PlatformHealthLoadingRows() {
  return (
    <>
      {Array.from({ length: 5 }, (_, index) => (
        <TableRow key={index}>
          <TableCell>
            <div className="space-y-2">
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              <div className="h-3 w-44 animate-pulse rounded bg-muted" />
            </div>
          </TableCell>
          <TableCell>
            <div className="h-5 w-20 animate-pulse rounded bg-muted" />
          </TableCell>
          <TableCell>
            <div className="h-6 w-16 animate-pulse rounded-full bg-muted" />
          </TableCell>
          <TableCell>
            <div className="space-y-2">
              <div className="h-5 w-40 animate-pulse rounded bg-muted" />
              <div className="h-3 w-52 animate-pulse rounded bg-muted" />
            </div>
          </TableCell>
          <TableCell>
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          </TableCell>
          <TableCell>
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

export function PlatformHealthPage() {
  const {
    data: suspiciousUsers = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = usePlatformHealth();

  const errorMessage =
    error instanceof Error
      ? error.message
      : "Unable to load platform health right now.";

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Platform Health</h1>
        <p className="text-sm text-muted-foreground">
          Monitor suspicious account behavior across bookings, reviews, reports,
          and ride activity.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Suspicious Users</CardTitle>
          <CardDescription>
            Ranked by weighted safety and reliability signals.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Risk Score</TableHead>
                  <TableHead>Reasons</TableHead>
                  <TableHead>Joined date</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <PlatformHealthLoadingRows />
              </TableBody>
            </Table>
          ) : isError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-5 text-sm">
              <p className="font-medium text-destructive">
                Failed to load platform health.
              </p>
              <p className="mt-1 text-destructive/80">{errorMessage}</p>
              <button
                type="button"
                onClick={() => void refetch()}
                disabled={isFetching}
                className="mt-4 rounded-md border border-destructive/30 px-3 py-1.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isFetching ? "Retrying..." : "Retry"}
              </button>
            </div>
          ) : suspiciousUsers.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
              No suspicious users were found. All users are behaving normally.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Risk Score</TableHead>
                  <TableHead>Reasons</TableHead>
                  <TableHead>Joined date</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suspiciousUsers.map((entry) => {
                  const statsSummary = formatPlatformHealthStats(entry);

                  return (
                    <TableRow key={entry.user.id}>
                      <TableCell>
                        <div className="font-medium">{entry.user.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {entry.user.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{entry.user.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={getRiskScoreClassName(entry.score)}
                        >
                          {entry.score}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2">
                            {entry.reasons.map((reason) => (
                              <Badge
                                key={reason}
                                variant="outline"
                                className={reasonBadgeClasses[reason]}
                              >
                                {reason}
                              </Badge>
                            ))}
                          </div>
                          {statsSummary ? (
                            <div className="text-xs text-muted-foreground">
                              {statsSummary}
                            </div>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatJoinedDate(entry.user.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Link
                          to={`/profile/${entry.user.id}`}
                          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                        >
                          View Profile
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
