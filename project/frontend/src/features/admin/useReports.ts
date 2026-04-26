import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/api/client";

import type { AdminReport, AdminReportStatus } from "./types";

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

interface UpdateReportStatusVariables {
  id: string;
  status: AdminReportStatus;
}

export function useUpdateReportStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: UpdateReportStatusVariables) =>
      api.patch(`/api/admin/reports/${id}`, { resolution: status }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: reportsQueryKey });
      await queryClient.invalidateQueries({ queryKey: ["adminStats"] });
    },
  });
}
