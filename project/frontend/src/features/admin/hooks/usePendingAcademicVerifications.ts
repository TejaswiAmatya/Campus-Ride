import { useQuery } from "@tanstack/react-query";

import { api } from "@/api/client";

import type { PendingAcademicVerification } from "@/features/admin/types";

type PendingAcademicVerificationApiItem = {
  id?: string;
  userId?: string;
  name: string;
  academicRole: "STUDENT" | "STAFF" | null;
  academicVerificationStatus: "PENDING";
  academicRejectionReason: string | null;
  academicIdSignedUrl?: string | null;
  academicIdUrl?: string | null;
  createdAt: string;
};

export const pendingAcademicVerificationsQueryKey = [
  "admin",
  "academic-verifications",
  "pending",
] as const;

export function usePendingAcademicVerifications() {
  return useQuery({
    queryKey: pendingAcademicVerificationsQueryKey,
    queryFn: async (): Promise<PendingAcademicVerification[]> => {
      const res = await api.get<{ data: PendingAcademicVerificationApiItem[] }>(
        "/api/admin/verifications/academic/pending",
      );

      return (res.data.data ?? []).flatMap((item) => {
        const userId = item.userId ?? item.id;
        if (!userId) {
          return [];
        }

        return [
          {
            userId,
            name: item.name,
            academicRole: item.academicRole,
            academicVerificationStatus: item.academicVerificationStatus,
            academicRejectionReason: item.academicRejectionReason,
            academicIdSignedUrl:
              item.academicIdSignedUrl ?? item.academicIdUrl ?? null,
            createdAt: item.createdAt,
          },
        ];
      });
    },
  });
}
