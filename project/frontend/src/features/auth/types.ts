import type { ProfileUser } from "@/features/user/types";

export type AuthUser = ProfileUser;

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  phone?: string;
}
