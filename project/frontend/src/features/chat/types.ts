export interface ChatParticipantSummary {
  id: string;
  name: string;
  avatarPath?: string | null;
}

export interface ChatMessage {
  rideId: string;
  senderId: string;
  senderName: string;
  senderAvatarPath: string | null;
  text: string;
  createdAt: string;
}

export interface ChatHistoryMessageResponse {
  id: string;
  rideId: string;
  senderId: string;
  text: string;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    avatarPath: string | null;
  };
}

export interface ChatMessageSocketPayload {
  rideId: string;
  senderId: string;
  senderName: string;
  senderAvatarPath?: string | null;
  text: string;
  createdAt: string;
}
