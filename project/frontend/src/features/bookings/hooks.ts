import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "@/api/client";
import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/lib/socket";
import type {
  BookingDetail,
  BookingListItem,
  BookingNewPayload,
  BookingStatusPayload,
} from "./types";

export function useBookings(params?: {
  asDriver?: boolean;
  status?: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
}) {
  const asDriver = params?.asDriver ?? false;
  const status = params?.status;

  return useQuery({
    queryKey: ["bookings", { asDriver: !!asDriver, status: status ?? "ALL" }],
    queryFn: async (): Promise<BookingListItem[]> => {
      const query = new URLSearchParams();
      if (asDriver) query.set("asDriver", "true");
      if (!asDriver && status) query.set("status", status);
      const res = await api.get<{ data: BookingListItem[] }>(
        `/api/bookings${query.toString() ? `?${query.toString()}` : ""}`,
      );
      return res.data.data ?? [];
    },
  });
}

export function useBooking(id: string | undefined) {
  return useQuery({
    queryKey: ["bookings", "detail", id],
    queryFn: async (): Promise<BookingDetail> => {
      const res = await api.get<{ data: BookingDetail }>(`/api/bookings/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });
}

export function useBookRide() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (input: { rideId: string; seatsBooked?: number }) => {
      const res = await api.post<{ data: BookingListItem }>("/api/bookings", {
        rideId: input.rideId,
        seatsBooked: input.seatsBooked ?? 1,
      });
      return res.data.data;
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["bookings"] });
      void queryClient.invalidateQueries({ queryKey: ["rides"] });
      navigate(`/bookings/${data.id}`);
    },
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookingId: string) => {
      const res = await api.patch<{ data: BookingListItem }>(
        `/api/bookings/${bookingId}/cancel`,
      );
      return res.data.data;
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["bookings"] });
      void queryClient.invalidateQueries({ queryKey: ["rides"] });
      void queryClient.invalidateQueries({
        queryKey: ["bookings", "detail", data.id],
      });
      // Query invalidation will trigger a refetch and update the UI automatically
    },
  });
}

export function useDriverBookingNewListener(enabled = true) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    if (!enabled || !isConnected || user?.role !== "DRIVER" || !user.id) {
      return;
    }

    socket.emit("join:user", { userId: user.id });

    function onBookingNew(_payload: BookingNewPayload) {
      void queryClient.invalidateQueries({ queryKey: ["bookings"] });
      void queryClient.invalidateQueries({ queryKey: ["rides"] });
      void queryClient.invalidateQueries({ queryKey: ["rides", "mine"] });
    }

    socket.on("booking:new", onBookingNew);

    return () => {
      socket.off("booking:new", onBookingNew);
    };
  }, [enabled, isConnected, queryClient, socket, user?.id, user?.role]);
}

export function usePassengerBookingStatusListener(enabled = true) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    if (!enabled || !isConnected || user?.role !== "PASSENGER" || !user.id) {
      return;
    }

    socket.emit("join:user", { userId: user.id });

    function onBookingStatus(payload: BookingStatusPayload) {
      void queryClient.invalidateQueries({ queryKey: ["bookings"] });
      void queryClient.invalidateQueries({
        queryKey: ["bookings", "detail", payload.bookingId],
      });
      void queryClient.invalidateQueries({ queryKey: ["rides"] });
    }

    socket.on("booking:status", onBookingStatus);

    return () => {
      socket.off("booking:status", onBookingStatus);
    };
  }, [enabled, isConnected, queryClient, socket, user?.id, user?.role]);
}
