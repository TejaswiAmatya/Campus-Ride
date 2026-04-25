import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";

export type AdminConfig = Record<string, string>;

export function useAdminConfig() {
  return useQuery<AdminConfig>({
    queryKey: ["adminConfig"],
    queryFn: async (): Promise<AdminConfig> => {
      const res = await api.get<{ data: AdminConfig }>("/api/config");
      return res.data.data ?? {};
    },
  });
}
