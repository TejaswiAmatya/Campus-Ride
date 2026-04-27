import { useQuery } from "@tanstack/react-query";

import { api } from "@/api/client";

import type { PlatformHealthUser } from "./types";

export const platformHealthQueryKey = ["admin", "health"] as const;

export function usePlatformHealth() {
  return useQuery({
    queryKey: platformHealthQueryKey,
    staleTime: 60_000,
    queryFn: async (): Promise<PlatformHealthUser[]> => {
      const res = await api.get<{ data: PlatformHealthUser[] }>(
        "/api/admin/health",
      );
      return res.data.data ?? [];
    },
  });
}
