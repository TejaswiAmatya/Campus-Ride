import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, LayoutDashboard, XCircle } from "lucide-react";
import { api } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminDecisionInline } from "@/features/admin/components/AdminDecisionInline";
import {
  pendingAcademicVerificationsQueryKey,
  usePendingAcademicVerifications,
} from "@/features/admin/hooks/usePendingAcademicVerifications";
import type { PendingDriver } from "../types";

export function DriverApprovalsPage() {
  const queryClient = useQueryClient();

  const { data: pendingDrivers } = useQuery({
    queryKey: ["admin", "drivers", "pending"],
    queryFn: async (): Promise<PendingDriver[]> => {
      const res = await api.get<{ data: PendingDriver[] }>(
        "/api/admin/drivers/pending",
      );
      return res.data.data ?? [];
    },
  });

  const driverDecisionMutation = useMutation({
    mutationFn: ({ id, approved }: { id: string; approved: boolean }) =>
      api.patch(`/api/admin/drivers/${id}/decision`, { approved }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
    },
  });

  const { data: pendingAcademicVerifications } =
    usePendingAcademicVerifications();

  const academicDecisionMutation = useMutation({
    mutationFn: ({
      userId,
      approved,
      reason,
    }: {
      userId: string;
      approved: boolean;
      reason?: string;
    }) =>
      api.patch(`/api/admin/verifications/academic/${userId}`, {
        approved,
        ...(approved ? {} : { reason }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: pendingAcademicVerificationsQueryKey,
      });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <LayoutDashboard className="h-6 w-6 text-foreground" />
        <h1 className="font-display text-display-md text-foreground">
          Driver Approvals
        </h1>
      </div>

      {(pendingDrivers ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No pending applications.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Applicant</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Licence</TableHead>
                <TableHead>Insurance</TableHead>
                <TableHead>Applied</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(pendingDrivers ?? []).map((driver) => (
                <TableRow key={driver.id}>
                  <TableCell className="font-medium text-foreground">
                    {driver.name}
                  </TableCell>
                  <TableCell>{driver.email}</TableCell>
                  <TableCell>
                    {driver.vehicle
                      ? `${driver.vehicle.year} ${driver.vehicle.make} ${driver.vehicle.model} (${driver.vehicle.plateNumber})`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {driver.licenceUrl ? (
                      <a
                        href={driver.licenceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        View
                      </a>
                    ) : (
                      <span>Not uploaded</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {driver.insuranceUrl ? (
                      <a
                        href={driver.insuranceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        View
                      </a>
                    ) : (
                      <span>Not uploaded</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(driver.createdAt).toLocaleDateString("en-GB")}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          driverDecisionMutation.mutate({
                            id: driver.id,
                            approved: true,
                          })
                        }
                        disabled={driverDecisionMutation.isPending}
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          driverDecisionMutation.mutate({
                            id: driver.id,
                            approved: false,
                          })
                        }
                        disabled={driverDecisionMutation.isPending}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Reject
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <section className="space-y-4">
        <div>
          <h2 className="font-display text-display-sm text-foreground">
            Academic Badge Verifications
          </h2>
        </div>

        {(pendingAcademicVerifications ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No pending academic verifications
          </p>
        ) : (
          <div className="space-y-4">
            {(pendingAcademicVerifications ?? []).map((verification) => {
              const userId = verification.userId;

              return (
                <Card key={userId} className="rounded-xl">
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <p className="font-medium text-foreground">
                        {verification.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {verification.academicRole === "STAFF"
                          ? "Staff"
                          : verification.academicRole === "STUDENT"
                            ? "Student"
                            : "—"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(verification.createdAt).toLocaleDateString(
                          "en-GB",
                        )}
                      </p>
                      {verification.academicIdSignedUrl ? (
                        <a
                          href={verification.academicIdSignedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          View ID Document
                        </a>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          ID document unavailable
                        </p>
                      )}
                    </div>

                    <div className="mt-4">
                      <AdminDecisionInline
                        isPending={academicDecisionMutation.isPending}
                        onApprove={() =>
                          userId
                            ? academicDecisionMutation.mutate({
                                userId,
                                approved: true,
                              })
                            : undefined
                        }
                        onReject={(reason) =>
                          userId
                            ? academicDecisionMutation.mutate({
                                userId,
                                approved: false,
                                reason,
                              })
                            : undefined
                        }
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
