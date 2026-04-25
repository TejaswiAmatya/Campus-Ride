import { useQueries, useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import type { BookingListItem } from '@/features/bookings/types'
import type { Ride } from '@/features/rides/types'

const STALE_TIME_MS = 60_000
const GC_TIME_MS = 10 * 60_000

export const passengerDashboardBookingsKey = ['dashboard', 'passenger', 'bookings'] as const
export const driverDashboardRidesKey = ['dashboard', 'driver', 'rides'] as const
export const driverDashboardPendingRequestsKey = ['dashboard', 'driver', 'pending-requests'] as const
export const driverDashboardEarningsKey = ['dashboard', 'driver', 'earnings'] as const

export function usePassengerDashboardData() {
  return useQuery({
    queryKey: passengerDashboardBookingsKey,
    queryFn: async (): Promise<{ upcomingBookings: BookingListItem[]; recentHistory: BookingListItem[] }> => {
      const res = await api.get<{ data: BookingListItem[] }>('/api/bookings')
      const bookings = res.data.data ?? []
      const now = Date.now()

      const upcomingBookings = bookings
        .filter(
          (booking) =>
            (booking.status === 'PENDING' || booking.status === 'CONFIRMED') &&
            new Date(booking.ride.departureTime).getTime() >= now,
        )
        .sort(
          (a, b) =>
            new Date(a.ride.departureTime).getTime() - new Date(b.ride.departureTime).getTime(),
        )

      const recentHistory = bookings
        .filter(
          (booking) =>
            booking.status === 'COMPLETED' || new Date(booking.ride.departureTime).getTime() < now,
        )
        .sort((a, b) => new Date(b.ride.departureTime).getTime() - new Date(a.ride.departureTime).getTime())

      return { upcomingBookings, recentHistory }
    },
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
  })
}

type EarningsSnapshot = {
  totalEarnings: number
  thisMonth: number
  pendingPayout: number
  currency: string
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function normalizeEarnings(payload: unknown): EarningsSnapshot {
  if (!payload || typeof payload !== 'object') {
    return { totalEarnings: 0, thisMonth: 0, pendingPayout: 0, currency: 'NOK' }
  }

  const data = payload as Record<string, unknown>
  return {
    totalEarnings: toNumber(data.totalEarnings),
    thisMonth: toNumber(data.thisMonth),
    pendingPayout: toNumber(data.pendingPayout),
    currency: typeof data.currency === 'string' ? data.currency : 'NOK',
  }
}

export function useDriverDashboardData() {
  const [ridesQuery, pendingRequestsQuery, earningsQuery] = useQueries({
    queries: [
      {
        queryKey: driverDashboardRidesKey,
        queryFn: async (): Promise<Ride[]> => {
          const res = await api.get<{ data: Ride[] }>('/api/rides/mine')
          return res.data.data ?? []
        },
        staleTime: STALE_TIME_MS,
        gcTime: GC_TIME_MS,
      },
      {
        queryKey: driverDashboardPendingRequestsKey,
        queryFn: async (): Promise<BookingListItem[]> => {
          const res = await api.get<{ data: BookingListItem[] }>('/api/bookings?asDriver=true')
          const bookings = res.data.data ?? []
          return bookings.filter((booking) => booking.status === 'PENDING')
        },
        staleTime: STALE_TIME_MS,
        gcTime: GC_TIME_MS,
      },
      {
        queryKey: driverDashboardEarningsKey,
        queryFn: async (): Promise<EarningsSnapshot> => {
          const res = await api.get<{ data: unknown }>('/api/bookings/earnings')
          return normalizeEarnings(res.data.data)
        },
        staleTime: STALE_TIME_MS,
        gcTime: GC_TIME_MS,
      },
    ],
  })

  return {
    rides: ridesQuery.data ?? [],
    pendingRequests: pendingRequestsQuery.data ?? [],
    earnings: earningsQuery.data ?? { totalEarnings: 0, thisMonth: 0, pendingPayout: 0, currency: 'NOK' },
    isLoading: ridesQuery.isLoading || pendingRequestsQuery.isLoading || earningsQuery.isLoading,
    isError: ridesQuery.isError || pendingRequestsQuery.isError || earningsQuery.isError,
    errors: {
      rides: ridesQuery.error,
      pendingRequests: pendingRequestsQuery.error,
      earnings: earningsQuery.error,
    },
  }
}
