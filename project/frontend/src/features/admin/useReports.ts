import { useQuery } from "@tanstack/react-query";

import { api } from "@/api/client";

import type { AdminReport } from "./types";

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
