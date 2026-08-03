import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";

export type UserGrowthPeriod = "daily" | "weekly" | "monthly";

export interface UserGrowthPoint {
  periodStart: string;
  periodEnd: string;
  driverCount: number;
  passengerCount: number;
  totalNewUsers: number;
  cumulativeTotalUsers: number;
  deactivatedOrBannedUsers: number;
  netGrowth: number;
}

export interface UserGrowthAnalytics {
  daily: UserGrowthPoint[];
  weekly: UserGrowthPoint[];
  monthly: UserGrowthPoint[];
  totals: {
    drivers: number;
    passengers: number;
    users: number;
  };
}

export function useUserGrowthAnalytics() {
  return useQuery<UserGrowthAnalytics>({
    queryKey: ["adminUserGrowthAnalytics"],
    queryFn: async (): Promise<UserGrowthAnalytics> => {
      const { data } = await api.get("/api/admin/analytics/user-growth");
      return data;
    },
  });
}
