import { AdminDashboard } from "./AdminDashboard";
import { DriverApprovalPage } from "./DriverApprovalPage";
import { ReportsPage } from "./ReportsPage";
import type { AppRoute } from "@/routes/types";

export const adminRoutes: AppRoute[] = [
  {
    path: "/admin",
    element: <AdminDashboard />,
    requiresAuth: true,
    requiredRole: "ADMIN",
  },
  {
    path: "/admin/drivers",
    element: <DriverApprovalPage />,
    requiresAuth: true,
    requiredRole: "ADMIN",
  },
  {
    path: "/admin/reports",
    element: <ReportsPage />,
    requiresAuth: true,
    requiredRole: "ADMIN",
  },
];
