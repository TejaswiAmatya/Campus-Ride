import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { useSocket } from "@/lib/socket";
import type {
  CreateRideDto,
  Ride,
  RideStatusUpdate,
  SearchRidesParams,
  UpdateRideDto,
  RideStatusPayload,
} from "./types";

export interface DriverLocation {
  lat: number;
  lng: number;
  updatedAt: string;
}

export function usePostRide() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateRideDto): Promise<Ride> => {
      const response = await api.post<{ data: Ride }>("/api/rides", payload);
      return response.data.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["rides"] });
    },
  });
}

export function useUpdateRide() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      rideId,
      payload,
    }: {
      rideId: string;
      payload: UpdateRideDto;
    }): Promise<{
      data: Ride;
      meta?: {
        notificationRequired?: boolean;
        notificationsTriggered?: boolean;
        confirmedPassengers?: number;
        updateMessage?: string | null;
      };
    }> => {
      const response = await api.patch<{
        data: Ride;
        meta?: {
          notificationRequired?: boolean;
          notificationsTriggered?: boolean;
          confirmedPassengers?: number;
          updateMessage?: string | null;
        };
      }>(`/api/rides/${rideId}`, payload);
      return response.data;
    },
    onSuccess: async ({ data: ride }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["rides"] }),
        queryClient.invalidateQueries({ queryKey: ["rides", "mine"] }),
        queryClient.invalidateQueries({
          queryKey: ["rides", "detail", ride.id],
        }),
        queryClient.invalidateQueries({ queryKey: ["bookings"] }),
      ]);
    },
  });
}

export function useSearchRides(params: SearchRidesParams) {
  return useQuery({
    queryKey: ["rides", "search", params],
    queryFn: async (): Promise<Ride[]> => {
      const response = await api.get<{ data: Ride[] }>("/api/rides", {
        params,
      });
      return response.data.data ?? [];
    },
  });
}

export function useRide(id?: string) {
  return useQuery({
    queryKey: ["rides", "detail", id],
    queryFn: async (): Promise<Ride> => {
      const response = await api.get<{ data: Ride }>(`/api/rides/${id}`);
      return response.data.data;
    },
    enabled: !!id,
  });
}

export function useDriverLocation(rideId?: string) {
  const { socket, isConnected } = useSocket();
  const [location, setLocation] = useState<DriverLocation | null>(null);

  useEffect(() => {
    if (!rideId) {
      setLocation(null);
      return;
    }

    if (!isConnected) return;

    socket.emit("join:ride", { rideId });

    function onDriverLocation(payload: DriverLocation) {
      setLocation(payload);
    }

    socket.on("driver:location", onDriverLocation);

    return () => {
      socket.off("driver:location", onDriverLocation);
    };
  }, [isConnected, rideId, socket]);

  return location;
}

export function useDriverLocationEmitter(rideId?: string) {
  const { socket } = useSocket();
  const watchIdRef = useRef<number | null>(null);
  const [isSharingLocation, setIsSharingLocation] = useState(false);

  useEffect(() => {
    if (!rideId) {
      setIsSharingLocation(false);
      return;
    }

    if (!navigator.geolocation) {
      setIsSharingLocation(false);
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        socket.emit("driver:locationUpdate", {
          rideId,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        setIsSharingLocation(false);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10_000,
        timeout: 10_000,
      },
    );

    watchIdRef.current = watchId;
    setIsSharingLocation(true);

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setIsSharingLocation(false);
    };
  }, [rideId, socket]);

  return { isSharingLocation };
}

export function useRideStatusListener(params?: {
  rideId?: string;
  bookingId?: string;
  enabled?: boolean;
}) {
  const queryClient = useQueryClient();
  const { socket, isConnected } = useSocket();
  const rideId = params?.rideId;
  const bookingId = params?.bookingId;
  const enabled = params?.enabled ?? true;

  useEffect(() => {
    if (!enabled || !rideId || !isConnected) {
      return;
    }

    socket.emit("join:ride", { rideId });

    function onRideStatus(payload: RideStatusPayload) {
      if (payload.rideId !== rideId) {
        return;
      }

      void queryClient.invalidateQueries({ queryKey: ["rides"] });
      void queryClient.invalidateQueries({
        queryKey: ["rides", "detail", rideId],
      });
      void queryClient.invalidateQueries({ queryKey: ["rides", "mine"] });
      void queryClient.invalidateQueries({ queryKey: ["bookings"] });

      if (bookingId) {
        void queryClient.invalidateQueries({
          queryKey: ["bookings", "detail", bookingId],
        });
      }
    }

    socket.on("ride:status", onRideStatus);

    return () => {
      socket.off("ride:status", onRideStatus);
    };
  }, [bookingId, enabled, isConnected, queryClient, rideId, socket]);
}

export function useMyRides() {
  return useQuery({
    queryKey: ["rides", "mine"],
    queryFn: async (): Promise<Ride[]> => {
      const response = await api.get<{ data: Ride[] }>("/api/rides/mine");
      return response.data.data ?? [];
    },
  });
}

export function useUpdateRideStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      rideId,
      status,
    }: {
      rideId: string;
      status: RideStatusUpdate;
    }): Promise<Ride> => {
      const response = await api.patch<{ data: Ride }>(
        `/api/rides/${rideId}/status`,
        { status },
      );
      return response.data.data;
    },
    onSuccess: async (ride) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["rides", "mine"] }),
        queryClient.invalidateQueries({
          queryKey: ["rides", "detail", ride.id],
        }),
        queryClient.invalidateQueries({ queryKey: ["rides", "search"] }),
        queryClient.invalidateQueries({ queryKey: ["bookings"] }),
      ]);
    },
  });
}

export function useCancelRide() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rideId: string): Promise<Ride> => {
      const response = await api.delete<{ data: Ride }>(`/api/rides/${rideId}`);
      return response.data.data;
    },
    onSuccess: async (ride) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["rides", "mine"] }),
        queryClient.invalidateQueries({
          queryKey: ["rides", "detail", ride.id],
        }),
        queryClient.invalidateQueries({ queryKey: ["rides", "search"] }),
        queryClient.invalidateQueries({ queryKey: ["bookings"] }),
      ]);
    },
  });
}
