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

export const meQueryKey = ["me"] as const;

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
