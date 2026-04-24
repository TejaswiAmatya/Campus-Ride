import { useQuery } from '@tanstack/react-query'

import { api } from '@/api/client'

import type { PendingDriver } from './types'

export const pendingDriversQueryKey = ['admin', 'drivers', 'pending'] as const

export function usePendingDrivers() {
  return useQuery({
    queryKey: pendingDriversQueryKey,
    queryFn: async (): Promise<PendingDriver[]> => {
      const res = await api.get<{ data: PendingDriver[] }>('/api/admin/drivers/pending')
      return res.data.data ?? []
    },
  })
}
