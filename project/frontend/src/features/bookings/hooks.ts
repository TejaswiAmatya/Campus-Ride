import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '@/api/client'
import type { BookingDetail, BookingListItem } from './types'

export function useBookings(asDriver?: boolean) {
  return useQuery({
    queryKey: ['bookings', { asDriver: !!asDriver }],
    queryFn: async (): Promise<BookingListItem[]> => {
      const res = await api.get<{ data: BookingListItem[] }>(
        `/api/bookings${asDriver ? '?asDriver=true' : ''}`,
      )
      return res.data.data ?? []
    },
  })
}

export function useBooking(id: string | undefined) {
  return useQuery({
    queryKey: ['bookings', 'detail', id],
    queryFn: async (): Promise<BookingDetail> => {
      const res = await api.get<{ data: BookingDetail }>(`/api/bookings/${id}`)
      return res.data.data
    },
    enabled: !!id,
  })
}

export function useBookRide() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: async (input: { rideId: string; seatsBooked?: number }) => {
      const res = await api.post<{ data: BookingListItem }>('/api/bookings', {
        rideId: input.rideId,
        seatsBooked: input.seatsBooked ?? 1,
      })
      return res.data.data
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['bookings'] })
      void queryClient.invalidateQueries({ queryKey: ['rides'] })
      navigate(`/bookings/${data.id}`)
    },
  })
}

export function useCancelBooking() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: async (bookingId: string) => {
      const res = await api.patch<{ data: BookingListItem }>(`/api/bookings/${bookingId}/cancel`)
      return res.data.data
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['bookings'] })
      void queryClient.invalidateQueries({ queryKey: ['rides'] })
      void queryClient.invalidateQueries({ queryKey: ['bookings', 'detail', data.id] })
      navigate(`/bookings/${data.id}`)
    },
  })
}
