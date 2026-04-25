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

import type { AdminReport, AdminReportStatus } from "./types";

interface ReportsTableProps {
  reports: AdminReport[];
  activeReportId: string | null;
  onUpdateStatus: (id: string, status: AdminReportStatus) => void;
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
  onUpdateStatus,
}: ReportsTableProps) {
  const [draftStatuses, setDraftStatuses] = useState<
    Record<string, AdminReportStatus>
  >({});

  useEffect(() => {
    setDraftStatuses(
      Object.fromEntries(
        reports.map((report) => [report.id, report.status]),
      ) as Record<string, AdminReportStatus>,
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
            const selectedStatus = draftStatuses[report.id] ?? report.status;
            const isSaving = activeReportId === report.id;
            const isUnchanged = selectedStatus === report.status;

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
                    {report.targetUserId
                      ? `User: ${report.targetUserId}`
                      : "No user target"}
                  </div>
                  <div>
                    {report.targetRideId
                      ? `Ride: ${report.targetRideId}`
                      : "No ride target"}
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
                      value={selectedStatus}
                      onChange={(event) =>
                        setDraftStatuses((current) => ({
                          ...current,
                          [report.id]: event.target.value as AdminReportStatus,
                        }))
                      }
                      disabled={isSaving}
                      aria-label={`Status for report ${report.id}`}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="OPEN">OPEN</option>
                      <option value="RESOLVED">RESOLVED</option>
                      <option value="DISMISSED">DISMISSED</option>
                    </select>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isSaving || isUnchanged}
                      onClick={() => onUpdateStatus(report.id, selectedStatus)}
                    >
                      {isSaving ? "Saving..." : "Save"}
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
