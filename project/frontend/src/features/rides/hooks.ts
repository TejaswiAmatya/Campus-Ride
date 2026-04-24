import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api/client'
import type { CreateRideDto, Ride, RideStatusUpdate, SearchRidesParams } from './types'

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

export function useMyRides() {
  return useQuery({
    queryKey: ['rides', 'mine'],
    queryFn: async (): Promise<Ride[]> => {
      const response = await api.get<{ data: Ride[] }>('/api/rides/mine')
      return response.data.data ?? []
    },
  })
}

export function useUpdateRideStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ rideId, status }: { rideId: string; status: RideStatusUpdate }): Promise<Ride> => {
      const response = await api.patch<{ data: Ride }>(`/api/rides/${rideId}/status`, { status })
      return response.data.data
    },
    onSuccess: async (ride) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['rides', 'mine'] }),
        queryClient.invalidateQueries({ queryKey: ['rides', 'detail', ride.id] }),
        queryClient.invalidateQueries({ queryKey: ['rides', 'search'] }),
      ])
    },
  })
}
