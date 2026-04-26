export interface PendingDriverVehicle {
  make: string;
  model: string;
  year: number;
  plateNumber: string;
}

export type AdminReportStatus = "OPEN" | "RESOLVED" | "DISMISSED";
export type AdminModerationAction = "WARNING" | "BAN" | "SUSPENSION";

export interface PendingDriver {
  id: string;
  name: string;
  email: string;
  licenceUrl?: string | null;
  vehicle?: PendingDriverVehicle | null;
  createdAt: string;
}

export interface AdminReport {
  id: string;
  reporter: {
    id: string;
    name: string;
    email: string;
  };
  targetUserId: string | null;
  targetRideId: string | null;
  targetUserSummary: {
    name: string | null;
    rideCount: number;
    rating: number | null;
    reportCount: number;
  };
  targetUserRole: "PASSENGER" | "DRIVER" | "ADMIN" | null;
  reason: string;
  status: AdminReportStatus;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}
