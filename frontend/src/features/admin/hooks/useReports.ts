import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/api/client";

import type { AdminModerationAction, AdminReport } from "../types";

export const reportsQueryKey = ["admin", "reports"] as const;

export function useReports() {
  return useQuery({
    queryKey: reportsQueryKey,
    queryFn: async (): Promise<AdminReport[]> => {
      const res = await api.get<{ data: AdminReport[] }>("/api/admin/reports");
      return res.data.data ?? [];
    },
  });
}

interface UpdateReportActionVariables {
  id: string;
  targetUserId: string;
  action: AdminModerationAction;
  reason: string;
}

export function useUpdateReportAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      targetUserId,
      action,
      reason,
    }: UpdateReportActionVariables) =>
      api.post(`/api/admin/users/${targetUserId}/moderation-actions`, {
        actionType: action,
        reason,
        reportId: id,
        suspendedUntil:
          action === "SUSPENSION"
            ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            : undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: reportsQueryKey });
      await queryClient.invalidateQueries({ queryKey: ["adminStats"] });
    },
  });
}
