import { LoginPage } from "./LoginPage"
import { RegisterPage } from "./RegisterPage"
import type { AppRoute } from "@/routes/types"

export const authRoutes: AppRoute[] = [
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
]
