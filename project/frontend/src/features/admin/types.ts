export interface PendingDriverVehicle {
  make: string;
  model: string;
  year: number;
  plateNumber: string;
}

export type AdminReportStatus = "OPEN" | "RESOLVED" | "DISMISSED";

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
  targetUserRole: "PASSENGER" | "DRIVER" | "ADMIN" | null;
  reason: string;
  status: AdminReportStatus;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}
