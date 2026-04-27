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
  insuranceUrl?: string | null;
  vehicle?: PendingDriverVehicle | null;
  createdAt: string;
}

export interface PendingAcademicVerification {
  userId: string;
  name: string;
  academicRole: "STUDENT" | "STAFF" | null;
  academicVerificationStatus: "PENDING";
  academicRejectionReason: string | null;
  academicIdSignedUrl: string;
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

export type PlatformHealthReason =
  | "High Cancellation Rate"
  | "Multiple Reports Received"
  | "Low Average Rating"
  | "No-Show Pattern"
  | "New Account Activity Spike";

export interface PlatformHealthUser {
  user: {
    id: string;
    name: string;
    email: string;
    role: "PASSENGER" | "DRIVER" | "ADMIN";
    createdAt: string;
  };
  reasons: PlatformHealthReason[];
  score: number;
  cancellationRate: number | null;
  reportsReceived: number | null;
  avgRating: number | null;
  noShowCount: number | null;
}
