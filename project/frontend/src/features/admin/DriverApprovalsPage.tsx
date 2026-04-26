import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, LayoutDashboard, XCircle } from "lucide-react";
import { api } from "@/api/client";
import type { PendingDriver } from "./types";

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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <LayoutDashboard className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Driver Approvals</h1>
      </div>

      {(pendingDrivers ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No pending applications.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Applicant</th>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Vehicle</th>
                <th className="px-4 py-3 text-left font-medium">Licence</th>
                <th className="px-4 py-3 text-left font-medium">Insurance</th>
                <th className="px-4 py-3 text-left font-medium">Applied</th>
                <th className="px-4 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(pendingDrivers ?? []).map((driver) => (
                <tr
                  key={driver.id}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3 font-medium">{driver.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {driver.email}
                  </td>
                  <td className="px-4 py-3">
                    {driver.vehicle
                      ? `${driver.vehicle.year} ${driver.vehicle.make} ${driver.vehicle.model} (${driver.vehicle.plateNumber})`
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
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
                      <span className="text-muted-foreground">
                        Not uploaded
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
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
                      <span className="text-muted-foreground">
                        Not uploaded
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(driver.createdAt).toLocaleDateString("en-GB")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          driverDecisionMutation.mutate({
                            id: driver.id,
                            approved: true,
                          })
                        }
                        disabled={driverDecisionMutation.isPending}
                        className="flex items-center gap-1 rounded-md bg-green-600 px-2.5 py-1 text-xs text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        Approve
                      </button>
                      <button
                        onClick={() =>
                          driverDecisionMutation.mutate({
                            id: driver.id,
                            approved: false,
                          })
                        }
                        disabled={driverDecisionMutation.isPending}
                        className="flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs hover:bg-muted disabled:opacity-50"
                      >
                        <XCircle className="h-3.5 w-3.5 text-destructive" />
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
