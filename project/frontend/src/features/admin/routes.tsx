import { AdminDashboard } from "./AdminDashboard";
import { DriverApprovalPage } from "./DriverApprovalPage";
import { PlatformHealthPage } from "./PlatformHealthPage";
import { ReportsPage } from "./ReportsPage";
import { SettingsPage } from "./SettingsPage";
import { ChangePasswordPage } from "./ChangePasswordPage";
import { SendAnnouncementPage } from "./SendAnnouncementPage";
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
  {
    path: "/admin/health",
    element: <PlatformHealthPage />,
    requiresAuth: true,
    requiredRole: "ADMIN",
  },
  {
    path: "/admin/announcements",
    element: <SendAnnouncementPage />,
    requiresAuth: true,
    requiredRole: "ADMIN",
  },
  {
    path: "/admin/settings",
    element: <SettingsPage />,
    requiresAuth: true,
    requiredRole: "ADMIN",
  },
  {
    path: "/admin/change-password",
    element: <ChangePasswordPage />,
    requiresAuth: true,
    requiredRole: "ADMIN",
  },
];
