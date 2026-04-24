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

interface UpdateProfileInput {
  name?: string;
  phone?: string;
  avatarPath?: string;
}

export const meQueryKey = ["auth", "currentUser"] as const;

const fetchMe = async (): Promise<ProfileUser> => {
  const res = await api.get<MeResponse>("/api/users/me");
  return res.data.data;
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
