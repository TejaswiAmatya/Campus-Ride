import { useQuery } from "@tanstack/react-query";
import { api } from "../../../api/client";

export interface AdminStats {
  activeRides: number;
  bookingsToday: number;
  bookingsThisWeek: number;
  bookingsThisMonth: number;
  ridesCompleted: number;
  ridesCancelled: number;
  pendingDrivers: number;
  openReports: number;
  totalDrivers: number;
  totalPassengers: number;
  totalRevenue: number;
  newUsersThisMonth: number;
}

export function useAdminStats() {
  return useQuery<AdminStats>({
    queryKey: ["adminStats"],
    queryFn: async (): Promise<AdminStats> => {
      const { data } = await api.get("/api/admin/stats");
      return data;
    },
  });
}
