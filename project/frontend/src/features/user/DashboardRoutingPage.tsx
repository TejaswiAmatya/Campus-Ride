import { useQuery } from '@tanstack/react-query'
import { Navigate } from 'react-router-dom'
import { fetchMe } from '@/api/client'
import { PendingDriverBanner } from '@/components/PendingDriverBanner'
import { canAccessDriverRoutes, isDriverPending } from '@/features/auth/routing'
import { PassengerDashboardPage } from './PassengerDashboardPage'

export function DashboardRoutingPage() {
  const { data: user, isLoading, isError } = useQuery({ queryKey: ['me'], queryFn: fetchMe })

  if (isLoading) {
    return (
      <div role="status" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <span>Loading...</span>
      </div>
    )
  }

  if (isError || !user) {
    return <Navigate to="/auth/login" replace />
  }

  if (canAccessDriverRoutes(user)) {
    return <Navigate to="/driver/dashboard" replace />
  }

  return (
    <>
      {isDriverPending(user) && <PendingDriverBanner />}
      <PassengerDashboardPage />
    </>
  )
}
