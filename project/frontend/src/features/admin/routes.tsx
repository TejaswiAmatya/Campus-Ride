import { AdminDashboard } from "./AdminDashboard"
import type { AppRoute } from "@/routes/types"

export const adminRoutes: AppRoute[] = [
  { path: "/admin", element: <AdminDashboard />, requiresAuth: true, requiredRole: "ADMIN" },
]
