import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/api/client";
import { useSocket } from "@/lib/socket";

import type {
  ChatHistoryMessageResponse,
  ChatMessage,
  ChatMessageSocketPayload,
  ChatParticipantSummary,
} from "../types";

function getRideChatQueryKey(rideId?: string) {
  return ["rides", "chat", rideId];
}

function toMessageKey(message: Pick<ChatMessage, "rideId" | "senderId" | "text" | "createdAt">) {
  return `${message.rideId}:${message.senderId}:${message.createdAt}:${message.text}`;
}

function appendMessage(existing: ChatMessage[] | undefined, nextMessage: ChatMessage) {
  const current = existing ?? [];
  const nextKey = toMessageKey(nextMessage);

  if (current.some((message) => toMessageKey(message) === nextKey)) {
    return current;
  }

  return [...current, nextMessage].sort(
    (left, right) =>
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  );
}

function normalizeHistoryMessage(message: ChatHistoryMessageResponse): ChatMessage {
  return {
    rideId: message.rideId,
    senderId: message.sender.id,
    senderName: message.sender.name,
    senderAvatarPath: message.sender.avatarPath ?? null,
    text: message.text,
    createdAt: message.createdAt,
  };
}

export function useRideChat(params: {
  rideId?: string;
  enabled?: boolean;
  knownParticipants?: ChatParticipantSummary[];
}) {
  const rideId = params.rideId;
  const enabled = params.enabled ?? true;
  const knownParticipants = params.knownParticipants ?? [];
  const queryClient = useQueryClient();
  const { socket, isConnected } = useSocket();

  const participantMap = useMemo(
    () =>
      new Map(
        knownParticipants.map((participant) => [
          participant.id,
          {
            name: participant.name,
            avatarPath: participant.avatarPath ?? null,
          },
        ]),
      ),
    [knownParticipants],
  );

  const query = useQuery({
    queryKey: getRideChatQueryKey(rideId),
    queryFn: async (): Promise<ChatMessage[]> => {
      const response = await api.get<ChatHistoryMessageResponse[]>(
        `/api/rides/${rideId}/messages`,
      );

      return response.data.map(normalizeHistoryMessage);
    },
    enabled: enabled && !!rideId,
  });

  useEffect(() => {
    if (!enabled || !rideId || !isConnected) {
      return;
    }

    function joinRideRoom() {
      socket.emit("join:ride", { rideId });
    }

    function handleMessage(payload: ChatMessageSocketPayload) {
      if (payload.rideId !== rideId) {
        return;
      }

      const participant = participantMap.get(payload.senderId);
      const nextMessage: ChatMessage = {
        rideId: payload.rideId,
        senderId: payload.senderId,
        senderName: participant?.name ?? payload.senderName,
        senderAvatarPath:
          payload.senderAvatarPath ?? participant?.avatarPath ?? null,
        text: payload.text,
        createdAt: payload.createdAt,
      };

      queryClient.setQueryData<ChatMessage[]>(
        getRideChatQueryKey(rideId),
        (current) => appendMessage(current, nextMessage),
      );
    }

    joinRideRoom();
    socket.on("connect", joinRideRoom);
    socket.on("chat:message", handleMessage);

    return () => {
      socket.off("connect", joinRideRoom);
      socket.off("chat:message", handleMessage);
    };
  }, [enabled, isConnected, participantMap, queryClient, rideId, socket]);

  function sendMessage(text: string) {
    if (!rideId || !isConnected) {
      return false;
    }

    const trimmed = text.trim();
    if (!trimmed) {
      return false;
    }

    socket.emit("chat:message", {
      rideId,
      text: trimmed,
    });

    return true;
  }

  return {
    ...query,
    messages: query.data ?? [],
    isConnected,
    sendMessage,
  };
}
