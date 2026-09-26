import { AlertCircle, FileWarning } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";

import { ReportsTable } from "./ReportsTable";
import { useReports, useUpdateReportAction } from "../hooks/useReports";

export function ReportsPage() {
  const {
    data: reports = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useReports();
  const updateReportActionMutation = useUpdateReportAction();

  const errorMessage =
    error instanceof Error ? error.message : "Unable to load reports.";
  const updateErrorMessage =
    updateReportActionMutation.error instanceof Error
      ? updateReportActionMutation.error.message
      : "Unable to apply the moderation action.";
  const activeReportId = updateReportActionMutation.isPending
    ? updateReportActionMutation.variables?.id ?? null
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FileWarning className="h-6 w-6 text-foreground" />
            <h1 className="font-display text-display-md text-foreground">
              Reports
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Review all filed reports from riders and drivers.
          </p>
        </div>

        <Button asChild variant="outline">
          <Link to="/admin">Back to dashboard</Link>
        </Button>
      </div>

      {updateReportActionMutation.isError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {updateErrorMessage}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-xl bg-card p-6">
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-16 animate-pulse rounded-xl bg-soft"
              />
            ))}
          </div>
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 text-destructive" />
            <div className="space-y-3">
              <div>
                <p className="font-medium text-destructive">
                  Failed to load reports.
                </p>
                <p className="text-destructive/80">{errorMessage}</p>
              </div>
              <Button
                onClick={() => void refetch()}
                disabled={isFetching}
                variant="outline"
              >
                {isFetching ? "Retrying…" : "Retry"}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <ReportsTable
          reports={reports}
          activeReportId={activeReportId}
          onUpdateAction={(report, action) => {
            if (!report.targetUserId) {
              return;
            }

            updateReportActionMutation.mutate({
              id: report.id,
              targetUserId: report.targetUserId,
              action,
              reason: report.reason,
            });
          }}
        />
      )}
    </div>
  );
}
