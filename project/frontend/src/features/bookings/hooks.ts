import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "@/api/client";
import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/lib/socket";
import { useToastStore } from "@/store/toastStore";
import type {
  BookingDetail,
  BookingListItem,
  BookingNewPayload,
  BookingStatusPayload,
  BookingLocation,
} from "./types";
import type {
  RideStatusPayload,
  RideStatusUpdatePayload,
} from "@/features/rides/types";

export function useBookingRealtime() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { socket, isConnected } = useSocket();
  const showToast = useToastStore((state) => state.showToast);
  const dismissToast = useToastStore((state) => state.dismissToast);
  const seenBookingEventsRef = useRef(new Set<string>());
  const seenRideEventsRef = useRef(new Set<string>());

  const { data: driverRides = [] } = useQuery({
    queryKey: ["rides", "mine"],
    queryFn: async (): Promise<Array<{ id: string }>> => {
      const res = await api.get<{ data: Array<{ id: string }> }>(
        "/api/rides/mine",
      );
      return res.data.data ?? [];
    },
    enabled: user?.role === "DRIVER",
  });

  const { data: passengerBookings = [] } = useQuery({
    queryKey: ["bookings", { asDriver: false, status: "ALL" }],
    queryFn: async (): Promise<BookingListItem[]> => {
      const res = await api.get<{ data: BookingListItem[] }>("/api/bookings");
      return res.data.data ?? [];
    },
    enabled: user?.role === "PASSENGER",
  });

  const rideIds =
    user?.role === "DRIVER"
      ? driverRides.map((ride) => ride.id)
      : passengerBookings
          .filter(
            (booking) =>
              booking.status === "CONFIRMED" || booking.status === "COMPLETED",
          )
          .map((booking) => booking.ride.id);
  const rideRoomIds = [...new Set(rideIds)];
  const rideRoomKey = rideRoomIds.join("|");

  useEffect(() => {
    if (!user || !isConnected) {
      return;
    }
    const currentUser = user;

    function joinUserRoom() {
      socket.emit("join:user", { userId: currentUser.id });
    }

    joinUserRoom();
    socket.on("connect", joinUserRoom);

    async function respondToBooking(
      bookingId: string,
      action: "confirm" | "decline",
      toastId: string,
    ) {
      try {
        const res = await api.patch<{ data: BookingListItem }>(
          `/api/bookings/${bookingId}/${action}`,
        );
        const updatedBooking = res.data.data;

        dismissToast(toastId);
        invalidateBookingAndRideQueries(queryClient, updatedBooking.id);
      } catch (error) {
        dismissToast(toastId);
        showToast({
          id: `${toastId}:${action}:error`,
          tone: "error",
          title:
            action === "confirm"
              ? "Could not accept booking"
              : "Could not decline booking",
          description:
            "The request could not be updated right now. Please try again.",
        });
      }
    }

    function handleBookingStatus(payload: BookingStatusPayload) {
      void queryClient.invalidateQueries({ queryKey: ["bookings"] });
      void queryClient.invalidateQueries({
        queryKey: ["bookings", "detail", payload.bookingId],
      });
      void queryClient.invalidateQueries({ queryKey: ["rides"] });
      void queryClient.invalidateQueries({ queryKey: ["rides", "mine"] });

      if (currentUser.role !== "PASSENGER") {
        return;
      }

      const eventKey = `${payload.bookingId}:${payload.status}`;
      if (seenBookingEventsRef.current.has(eventKey)) {
        return;
      }
      seenBookingEventsRef.current.add(eventKey);

      if (payload.status === "confirmed") {
        showToast({
          id: `booking-status:${eventKey}`,
          tone: "success",
          title: "Ride request accepted",
          description: "Your driver accepted the booking request.",
        });
      }

      if (payload.status === "declined") {
        showToast({
          id: `booking-status:${eventKey}`,
          tone: "error",
          title: "Ride request declined",
          description: "Your driver declined the booking request.",
        });
      }
    }

    function handleBookingNew(payload: BookingNewPayload) {
      void queryClient.invalidateQueries({ queryKey: ["bookings"] });
      void queryClient.invalidateQueries({ queryKey: ["rides", "mine"] });

      if (currentUser.role !== "DRIVER") {
        return;
      }

      const toastId = `booking-new:${payload.bookingId}`;
      if (seenBookingEventsRef.current.has(toastId)) {
        return;
      }
      seenBookingEventsRef.current.add(toastId);

      showToast({
        id: toastId,
        title: "New ride request",
        description: "A passenger just booked one of your rides.",
        duration: 0,
        actions: [
          {
            label: "Accept",
            onClick: () =>
              respondToBooking(payload.bookingId, "confirm", toastId),
          },
          {
            label: "Decline",
            variant: "outline",
            onClick: () =>
              respondToBooking(payload.bookingId, "decline", toastId),
          },
        ],
      });
    }

    socket.on("booking:status", handleBookingStatus);
    socket.on("booking:new", handleBookingNew);

    return () => {
      socket.off("connect", joinUserRoom);
      socket.off("booking:status", handleBookingStatus);
      socket.off("booking:new", handleBookingNew);
    };
  }, [dismissToast, isConnected, queryClient, showToast, socket, user]);

  useEffect(() => {
    if (!isConnected || !rideRoomKey) {
      return;
    }

    rideRoomKey.split("|").forEach((rideId) => {
      socket.emit("join:ride", { rideId });
    });
  }, [isConnected, rideRoomKey, socket]);

  useEffect(() => {
    if (!user || !isConnected) {
      return;
    }

    function handleRideStatus(payload: RideStatusPayload) {
      void queryClient.invalidateQueries({ queryKey: ["rides"] });
      void queryClient.invalidateQueries({
        queryKey: ["rides", "detail", payload.rideId],
      });
      void queryClient.invalidateQueries({ queryKey: ["rides", "mine"] });
      void queryClient.invalidateQueries({ queryKey: ["bookings"] });

      if (payload.status !== "in_progress" && payload.status !== "finished") {
        return;
      }

      const eventKey = `${payload.rideId}:${payload.status}`;
      if (seenRideEventsRef.current.has(eventKey)) {
        return;
      }
      seenRideEventsRef.current.add(eventKey);

      showToast({
        id: `ride-status:${eventKey}`,
        tone: payload.status === "finished" ? "success" : "default",
        title:
          payload.status === "finished" ? "Ride completed" : "Ride started",
        description:
          payload.status === "finished"
            ? "This ride has been marked complete."
            : "This ride is now in progress.",
      });
    }

    function handleRideUpdated(payload: RideStatusUpdatePayload) {
      void queryClient.invalidateQueries({ queryKey: ["rides"] });
      void queryClient.invalidateQueries({
        queryKey: ["rides", "detail", payload.rideId],
      });
      void queryClient.invalidateQueries({ queryKey: ["rides", "mine"] });
      void queryClient.invalidateQueries({ queryKey: ["bookings"] });

      const eventKey = `${payload.rideId}:${payload.updatedAt}`;
      if (seenRideEventsRef.current.has(eventKey)) {
        return;
      }
      seenRideEventsRef.current.add(eventKey);

      showToast({
        id: `ride-updated:${eventKey}`,
        tone: "default",
        title: "Ride details updated",
        description: payload.updateMessage ?? "Your driver updated this ride.",
      });
    }

    socket.on("ride:status", handleRideStatus);
    socket.on("ride:updated", handleRideUpdated);

    return () => {
      socket.off("ride:status", handleRideStatus);
      socket.off("ride:updated", handleRideUpdated);
    };
  }, [isConnected, queryClient, showToast, socket, user]);
}

export function useBookings(params?: {
  asDriver?: boolean;
  status?: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
}) {
  const asDriver = params?.asDriver ?? false;
  const status = params?.status;

  return useQuery({
    queryKey: ["bookings", { asDriver, status: status ?? "ALL" }],
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

export function useUpcomingPassengerBookings() {
  const bookingsQuery = useBookings();

  return {
    ...bookingsQuery,
    data: (bookingsQuery.data ?? [])
      .filter((booking) => {
        if (booking.status !== "CONFIRMED") {
          return false;
        }

        return new Date(booking.ride.departureTime).getTime() > Date.now();
      })
      .sort(
        (left, right) =>
          new Date(left.ride.departureTime).getTime() -
          new Date(right.ride.departureTime).getTime(),
      ),
  };
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
    mutationFn: async (input: {
      rideId: string;
      seatsBooked?: number;
      pickup?: BookingLocation;
      dropoff?: BookingLocation;
      messageToDriver?: string;
    }) => {
      const res = await api.post<{ data: BookingListItem }>("/api/bookings", {
        rideId: input.rideId,
        seatsBooked: input.seatsBooked ?? 1,
        pickup: input.pickup,
        dropoff: input.dropoff,
        messageToDriver: input.messageToDriver,
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
      invalidateBookingAndRideQueries(queryClient, data.id);
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

function invalidateBookingAndRideQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  bookingId: string,
) {
  void queryClient.invalidateQueries({ queryKey: ["bookings"] });
  void queryClient.invalidateQueries({
    queryKey: ["bookings", "detail", bookingId],
  });
  void queryClient.invalidateQueries({ queryKey: ["rides"] });
  void queryClient.invalidateQueries({ queryKey: ["rides", "mine"] });
}

export function useConfirmBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookingId: string) => {
      const res = await api.patch<{ data: BookingListItem }>(
        `/api/bookings/${bookingId}/confirm`,
      );
      return res.data.data;
    },
    onSuccess: (data) => {
      invalidateBookingAndRideQueries(queryClient, data.id);
    },
  });
}

export function useDeclineBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookingId: string) => {
      const res = await api.patch<{ data: BookingListItem }>(
        `/api/bookings/${bookingId}/decline`,
      );
      return res.data.data;
    },
    onSuccess: (data) => {
      invalidateBookingAndRideQueries(queryClient, data.id);
    },
  });
}

export function useMarkBookingPickedUp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookingId: string) => {
      const res = await api.patch<{ data: BookingListItem }>(
        `/api/bookings/${bookingId}/picked-up`,
        {},
      );
      return res.data.data;
    },
    onSuccess: (data) => {
      invalidateBookingAndRideQueries(queryClient, data.id);
    },
  });
}

export function useMarkBookingNoShow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookingId: string) => {
      const res = await api.patch<{ data: BookingListItem }>(
        `/api/bookings/${bookingId}/no-show`,
        {},
      );
      return res.data.data;
    },
    onSuccess: (data) => {
      invalidateBookingAndRideQueries(queryClient, data.id);
    },
  });
}

export function useCreateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      bookingId: string;
      rating: number;
      comment?: string;
    }) => {
      const res = await api.post(`/api/bookings/${input.bookingId}/review`, {
        rating: input.rating,
        comment: input.comment,
      });
      return res.data;
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["bookings", "detail", variables.bookingId],
      });
      void queryClient.invalidateQueries({ queryKey: ["bookings"] });
      void queryClient.invalidateQueries({ queryKey: ["rides"] });
      void queryClient.invalidateQueries({ queryKey: ["rides", "mine"] });
    },
  });
}
