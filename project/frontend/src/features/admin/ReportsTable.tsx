import { useEffect, useState } from "react";

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

import type {
  AdminModerationAction,
  AdminReport,
} from "./types";

interface ReportsTableProps {
  reports: AdminReport[];
  activeReportId: string | null;
  onUpdateAction: (report: AdminReport, action: AdminModerationAction) => void;
}

function getStatusVariant(status: AdminReport["status"]) {
  if (status === "OPEN") {
    return "destructive";
  }

  if (status === "RESOLVED") {
    return "default";
  }

  return "secondary";
}

export function ReportsTable({
  reports,
  activeReportId,
  onUpdateAction,
}: ReportsTableProps) {
  const [draftActions, setDraftActions] = useState<
    Record<string, AdminModerationAction | "">
  >({});

  useEffect(() => {
    setDraftActions(
      Object.fromEntries(
        reports.map((report) => [report.id, ""]),
      ) as Record<string, AdminModerationAction | "">,
    );
  }, [reports]);

  if (reports.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground shadow-sm">
        No reports found.
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card shadow-sm">
      <Table data-testid="reports-table">
        <TableHeader>
          <TableRow>
            <TableHead>Reporter</TableHead>
            <TableHead>Target</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Reported At</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reports.map((report) => {
            const selectedAction = draftActions[report.id] ?? "";
            const isSaving = activeReportId === report.id;
            const isActionSelected = selectedAction !== "";

            return (
              <TableRow key={report.id}>
                <TableCell className="font-medium">
                  <div>{report.reporter.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {report.reporter.email}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  <div>
                    User: {report.targetUserSummary.name ?? "Unknown user"}
                  </div>
                  <div>
                    Ride-Count: {report.targetUserSummary.rideCount}
                  </div>
                  <div>
                    Rating:{" "}
                    {report.targetUserSummary.rating === null
                      ? "No ratings"
                      : report.targetUserSummary.rating.toFixed(1)}
                  </div>
                  <div>
                    Report: {report.targetUserSummary.reportCount}
                  </div>
                </TableCell>
                <TableCell className="max-w-sm whitespace-normal break-words text-sm">
                  {report.reason}
                </TableCell>
                <TableCell>
                  <div className="space-y-2">
                    <Badge variant={getStatusVariant(report.status)}>
                      {report.status}
                    </Badge>
                    <div className="text-xs text-muted-foreground">
                      Updated {new Date(report.updatedAt).toLocaleString()}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(report.createdAt).toLocaleString()}
                </TableCell>
                <TableCell>
                  <div className="flex min-w-52 items-center gap-2">
                    <select
                      value={selectedAction}
                      onChange={(event) =>
                        setDraftActions((current) => ({
                          ...current,
                          [report.id]: event.target.value as AdminModerationAction | "",
                        }))
                      }
                      disabled={isSaving}
                      aria-label={`Action for report ${report.id}`}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">Select action</option>
                      <option value="WARNING">Warning</option>
                      <option value="BAN">Banned</option>
                      <option value="SUSPENSION">Suspend (1 week)</option>
                    </select>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isSaving || !isActionSelected}
                      onClick={() => onUpdateAction(report, selectedAction)}
                    >
                      {isSaving ? "Saving..." : "Apply"}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
