import type { MeApiResponse, MeUser } from "@/api/client";

export type ProfileUser = MeUser;

export interface MeResponse {
  data: MeApiResponse;
}

export interface UpdateProfileInput {
  name?: string;
  phone?: string;
  avatarPath?: string;
  bio?: string | null;
  homeAddress?: string | null;
  homeLat?: number | null;
  homeLng?: number | null;
  campusAddress?: string | null;
  campusLat?: number | null;
  campusLng?: number | null;
}

export interface ReviewUserSummary {
  id: string;
  name: string;
  avatarPath: string | null;
}

export interface PublicUserSummary {
  id: string;
  name: string;
  role: "PASSENGER" | "DRIVER" | "ADMIN";
  avatarPath: string | null;
  academicRole: "STUDENT" | "STAFF" | null;
  academicVerificationStatus:
    | "NOT_SUBMITTED"
    | "PENDING"
    | "VERIFIED"
    | "REJECTED";
}

export interface UserReview {
  id: string;
  rideId: string;
  revieweeId: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
  reviewer: ReviewUserSummary;
}

export interface CreateRideReviewInput {
  revieweeId: string;
  rating: number;
  comment?: string;
}

export interface DriverRideReviewPassenger {
  id: string;
  name: string;
}
