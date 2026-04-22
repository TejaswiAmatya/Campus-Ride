import { useQuery } from "@tanstack/react-query";
import { api } from "../../api/client";

export function useAdminStats() {
  return useQuery({
    queryKey: ["adminStats"],
    queryFn: async () => {
      const { data } = await api.get("/api/admin/stats");
      return data;
    },
  });
}
