import { useQuery } from "@tanstack/react-query";

import { api } from "@/api/client";

import type { PendingAcademicVerification } from "@/features/admin/types";

export const pendingAcademicVerificationsQueryKey = [
  "admin",
  "academic-verifications",
  "pending",
] as const;

export function usePendingAcademicVerifications() {
  return useQuery({
    queryKey: pendingAcademicVerificationsQueryKey,
    queryFn: async (): Promise<PendingAcademicVerification[]> => {
      const res = await api.get<{ data: PendingAcademicVerification[] }>(
        "/api/admin/verifications/academic/pending",
      );
      return res.data.data ?? [];
    },
  });
}
