import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { useAuthStore } from "@/store/authStore";

export interface ProfileUser {
  id: string;
  email: string;
  name: string;
  role: "PASSENGER" | "DRIVER" | "ADMIN";
  avatarPath?: string;
  phone?: string;
  isDriverApproved?: boolean;
}

export interface MeResponse {
  data: ProfileUser;
}

interface MeApiResponse {
  id: string;
  email: string;
  name: string;
  role: "PASSENGER" | "DRIVER" | "ADMIN";
  avatarUrl: string | null;
  driverStatus: "PENDING" | "APPROVED" | "REJECTED" | null;
  createdAt: string;
}

interface UpdateProfileInput {
  name?: string;
  phone?: string;
  avatarPath?: string;
}

export interface ReviewUserSummary {
  id: string;
  name: string;
  avatarPath: string | null;
}

export interface UserReview {
  id: string;
  rideId: string;
  revieweeId?: string;
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

export const meQueryKey = ["me"] as const;
export const userReviewsQueryKey = (userId?: string) =>
  ["reviews", userId] as const;
export const rideDetailQueryKey = (rideId?: string) =>
  ["rides", "detail", rideId] as const;
export const myRidesQueryKey = ["rides", "mine"] as const;

export const fetchMe = async (): Promise<ProfileUser> => {
  const res = await api.get<MeApiResponse | MeResponse>("/api/users/me");
  const payload = "data" in res.data ? res.data.data : res.data;

  if ("driverStatus" in payload) {
    return {
      id: payload.id,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      avatarPath: payload.avatarUrl ?? undefined,
      isDriverApproved: payload.driverStatus === "APPROVED",
    };
  }

  return payload;
};

export function useProfile() {
  const token = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: meQueryKey,
    queryFn: fetchMe,
    enabled: !!token,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: async (payload: UpdateProfileInput) => {
      const res = await api.patch<MeResponse>("/api/users/me", payload);
      return res.data.data;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(meQueryKey, (current?: ProfileUser) =>
        current ? { ...current, ...user } : user,
      );

      const currentUser = useAuthStore.getState().user;
      if (currentUser) {
        setUser({ ...currentUser, ...user });
      }

      void queryClient.invalidateQueries({ queryKey: meQueryKey });
    },
  });
}

export function useUserReviews(userId?: string) {
  return useQuery({
    queryKey: userReviewsQueryKey(userId),
    queryFn: async (): Promise<UserReview[]> => {
      if (!userId) return [];

      const res = await api.get<{ data: UserReview[] }>(`/api/users/${userId}/reviews`);
      return res.data.data ?? [];
    },
    enabled: !!userId,
  });
}

export function useCreateRideReview(rideId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateRideReviewInput): Promise<UserReview> => {
      const res = await api.post<{ data: UserReview }>(
        `/api/rides/${rideId}/reviews`,
        payload,
      );
      return res.data.data;
    },
    onSuccess: async (review) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: rideDetailQueryKey(rideId) }),
        queryClient.invalidateQueries({ queryKey: myRidesQueryKey }),
        queryClient.invalidateQueries({
          queryKey: userReviewsQueryKey(review.revieweeId),
        }),
      ]);
    },
  });
}
