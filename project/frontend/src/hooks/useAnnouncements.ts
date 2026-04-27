import { useEffect, useState } from "react";
import { apiClient } from "@/api/client";
import { useAuth } from "@/hooks/useAuth";
import { getSocket } from "@/lib/socket";

export type AnnouncementItem = {
  id: string;
  subject: string;
  message: string;
  createdAt: string;
};

type AnnouncementListResponse = {
  data: AnnouncementItem[];
};

function mergeUniqueAnnouncements(
  currentQueue: AnnouncementItem[],
  nextAnnouncements: AnnouncementItem[],
) {
  const seenIds = new Set(currentQueue.map((announcement) => announcement.id));
  const uniqueAnnouncements = nextAnnouncements.filter(
    (announcement) => !seenIds.has(announcement.id),
  );

  return [...currentQueue, ...uniqueAnnouncements];
}

export function useAnnouncements() {
  const { user, isAuthenticated } = useAuth();
  const [queue, setQueue] = useState<AnnouncementItem[]>([]);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setQueue([]);
      return;
    }

    const socket = getSocket();
    let isMounted = true;

    const handleAnnouncement = (announcement: AnnouncementItem) => {
      setQueue((currentQueue) => [
        announcement,
        ...currentQueue.filter((item) => item.id !== announcement.id),
      ]);
    };

    socket.on("announcement", handleAnnouncement);

    if (!socket.connected) {
      socket.connect();
    }

    void apiClient
      .get<AnnouncementListResponse>("/api/admin/announcements/unread")
      .then((response) => {
        if (!isMounted) {
          return;
        }

        const unreadAnnouncements = response.data.data ?? [];
        setQueue((currentQueue) =>
          currentQueue.length === 0
            ? unreadAnnouncements
            : mergeUniqueAnnouncements(currentQueue, unreadAnnouncements),
        );
      })
      .catch((error) => {
        console.error("[useAnnouncements] Failed to load unread announcements", error);
      });

    return () => {
      isMounted = false;
      socket.off("announcement", handleAnnouncement);
    };
  }, [isAuthenticated, user]);

  const currentAnnouncement = queue[0] ?? null;

  async function dismissAnnouncement() {
    if (!currentAnnouncement) {
      return;
    }

    const dismissedAnnouncementId = currentAnnouncement.id;
    setQueue((currentQueue) =>
      currentQueue.filter((announcement) => announcement.id !== dismissedAnnouncementId),
    );

    try {
      await apiClient.post(`/api/admin/announcements/${dismissedAnnouncementId}/read`);
    } catch (error) {
      console.error("[useAnnouncements] Failed to mark announcement as read", {
        announcementId: dismissedAnnouncementId,
        error,
      });
    }
  }

  return {
    currentAnnouncement,
    dismissAnnouncement,
    queueLength: queue.length,
  };
}
