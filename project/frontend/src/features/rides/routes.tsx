import { Navigate } from "react-router-dom"
import { PostRidePage } from "./PostRidePage"
import { RidesPage } from "./RidesPage"
import type { AppRoute } from "@/routes/types"

export const rideRoutes: AppRoute[] = [
  { path: "/", element: <Navigate to="/rides" replace />, requiresAuth: true },
  { path: "/rides", element: <RidesPage />, requiresAuth: true },
  { path: "/rides/post", element: <PostRidePage />, requiresAuth: true },
]
