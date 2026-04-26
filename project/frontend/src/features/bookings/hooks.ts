import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

import { api } from '@/api/client'
import { useAuth } from '@/hooks/useAuth'
import { useSocket } from '@/lib/socket'

import type { BookingDetail, BookingListItem, BookingLocation } from './types'

export function useBookingRealtime() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { socket, isConnected } = useSocket()

  useEffect(() => {
    if (!user || !isConnected) {
      return
    }

    socket.emit('join:user', { userId: user.id })

    function handleBookingStatus(payload: { bookingId: string }) {
      void queryClient.invalidateQueries({ queryKey: ['bookings'] })
      void queryClient.invalidateQueries({ queryKey: ['bookings', 'detail', payload.bookingId] })
      void queryClient.invalidateQueries({ queryKey: ['rides'] })
      void queryClient.invalidateQueries({ queryKey: ['rides', 'mine'] })
    }

    function handleBookingNew() {
      void queryClient.invalidateQueries({ queryKey: ['bookings'] })
      void queryClient.invalidateQueries({ queryKey: ['rides', 'mine'] })
    }

    socket.on('booking:status', handleBookingStatus)
    socket.on('booking:new', handleBookingNew)

    return () => {
      socket.off('booking:status', handleBookingStatus)
      socket.off('booking:new', handleBookingNew)
    }
  }, [isConnected, queryClient, socket, user])
}

export function useBookings(params?: {
  asDriver?: boolean
  status?: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED'
}) {
  const asDriver = params?.asDriver ?? false
  const status = params?.status

  return useQuery({
    queryKey: ['bookings', { asDriver, status: status ?? 'ALL' }],
    queryFn: async (): Promise<BookingListItem[]> => {
      const query = new URLSearchParams()
      if (asDriver) query.set('asDriver', 'true')
      if (!asDriver && status) query.set('status', status)

      const res = await api.get<{ data: BookingListItem[] }>(
        `/api/bookings${query.toString() ? `?${query.toString()}` : ''}`,
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
    mutationFn: async (input: {
      rideId: string
      seatsBooked?: number
      pickup?: BookingLocation
      dropoff?: BookingLocation
      messageToDriver?: string
    }) => {
      const res = await api.post<{ data: BookingListItem }>('/api/bookings', {
        rideId: input.rideId,
        seatsBooked: input.seatsBooked ?? 1,
        pickup: input.pickup,
        dropoff: input.dropoff,
        messageToDriver: input.messageToDriver,
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

  return useMutation({
    mutationFn: async (bookingId: string) => {
      const res = await api.patch<{ data: BookingListItem }>(`/api/bookings/${bookingId}/cancel`)
      return res.data.data
    },
    onSuccess: (data) => {
      invalidateBookingAndRideQueries(queryClient, data.id)
    },
  })
}

function invalidateBookingAndRideQueries(queryClient: ReturnType<typeof useQueryClient>, bookingId: string) {
  void queryClient.invalidateQueries({ queryKey: ['bookings'] })
  void queryClient.invalidateQueries({ queryKey: ['bookings', 'detail', bookingId] })
  void queryClient.invalidateQueries({ queryKey: ['rides'] })
  void queryClient.invalidateQueries({ queryKey: ['rides', 'mine'] })
}

export function useConfirmBooking() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (bookingId: string) => {
      const res = await api.patch<{ data: BookingListItem }>(`/api/bookings/${bookingId}/confirm`)
      return res.data.data
    },
    onSuccess: (data) => {
      invalidateBookingAndRideQueries(queryClient, data.id)
    },
  })
}

export function useDeclineBooking() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (bookingId: string) => {
      const res = await api.patch<{ data: BookingListItem }>(`/api/bookings/${bookingId}/decline`)
      return res.data.data
    },
    onSuccess: (data) => {
      invalidateBookingAndRideQueries(queryClient, data.id)
    },
  })
}

export function useMarkBookingPickedUp() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (bookingId: string) => {
      const res = await api.patch<{ data: BookingListItem }>(`/api/bookings/${bookingId}/picked-up`, {})
      return res.data.data
    },
    onSuccess: (data) => {
      invalidateBookingAndRideQueries(queryClient, data.id)
    },
  })
}

export function useMarkBookingNoShow() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (bookingId: string) => {
      const res = await api.patch<{ data: BookingListItem }>(`/api/bookings/${bookingId}/no-show`, {})
      return res.data.data
    },
    onSuccess: (data) => {
      invalidateBookingAndRideQueries(queryClient, data.id)
    },
  })
}

export function useCreateReview() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      bookingId: string
      rating: number
      comment?: string
    }) => {
      const res = await api.post(`/api/bookings/${input.bookingId}/review`, {
        rating: input.rating,
        comment: input.comment,
      })
      return res.data
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['bookings', 'detail', variables.bookingId] })
      void queryClient.invalidateQueries({ queryKey: ['bookings'] })
      void queryClient.invalidateQueries({ queryKey: ['rides'] })
      void queryClient.invalidateQueries({ queryKey: ['rides', 'mine'] })
    },
  })
}
