import { Link } from "react-router-dom";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { usePlatformHealth } from "../hooks/usePlatformHealth";
import type { PlatformHealthReason, PlatformHealthUser } from "../types";

const reasonBadgeVariant: Record<
  PlatformHealthReason,
  "destructive" | "warning" | "secondary" | "outline"
> = {
  "High Cancellation Rate": "warning",
  "Multiple Reports Received": "destructive",
  "Low Average Rating": "warning",
  "No-Show Pattern": "secondary",
  "New Account Activity Spike": "outline",
};

function getRiskScoreVariant(
  score: number,
): "destructive" | "warning" | "success" {
  if (score > 60) {
    return "destructive";
  }

  if (score >= 30) {
    return "warning";
  }

  return "success";
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
        <h1 className="font-display text-display-md text-foreground">
          Platform Health
        </h1>
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
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-5 text-sm">
              <p className="font-medium text-destructive">
                Failed to load platform health.
              </p>
              <p className="mt-1 text-destructive/80">{errorMessage}</p>
              <Button
                type="button"
                variant="outline"
                onClick={() => void refetch()}
                disabled={isFetching}
                className="mt-4"
              >
                {isFetching ? "Retrying..." : "Retry"}
              </Button>
            </div>
          ) : suspiciousUsers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-soft px-4 py-8 text-center text-sm text-muted-foreground">
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
                        <Badge variant={getRiskScoreVariant(entry.score)}>
                          {entry.score}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2">
                            {entry.reasons.map((reason) => (
                              <Badge
                                key={reason}
                                variant={reasonBadgeVariant[reason]}
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
