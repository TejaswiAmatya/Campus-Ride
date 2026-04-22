import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import type { CreateRideDto, Ride, SearchRidesParams } from './types'

export function usePostRide() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: CreateRideDto): Promise<Ride> => {
      const response = await api.post<{ data: Ride }>('/api/rides', payload)
      return response.data.data
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['rides'] })
    },
  })
}

export function useSearchRides(params: SearchRidesParams) {
  return useQuery({
    queryKey: ['rides', 'search', params],
    queryFn: async (): Promise<Ride[]> => {
      const response = await api.get<{ data: Ride[] }>('/api/rides', { params })
      return response.data.data ?? []
    },
  })
}

export function useRide(id?: string) {
  return useQuery({
    queryKey: ['rides', 'detail', id],
    queryFn: async (): Promise<Ride> => {
      const response = await api.get<{ data: Ride }>(`/api/rides/${id}`)
      return response.data.data
    },
    enabled: !!id,
  })
}
