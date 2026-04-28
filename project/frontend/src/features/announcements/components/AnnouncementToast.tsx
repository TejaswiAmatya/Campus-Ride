import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AnnouncementItem } from "@/features/announcements/types";
import { cn } from "@/lib/utils";

type AnnouncementToastProps = {
  announcement: AnnouncementItem | null;
  onDismiss: () => Promise<void> | void;
  queueLength: number;
};

export function AnnouncementToast({
  announcement,
  onDismiss,
  queueLength,
}: AnnouncementToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);

  useEffect(() => {
    if (!announcement) {
      setIsVisible(false);
      setIsDismissing(false);
      return;
    }

    setIsVisible(false);
    setIsDismissing(false);

    const animationFrame = window.requestAnimationFrame(() => {
      setIsVisible(true);
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [announcement?.id]);

  useEffect(() => {
    if (!announcement) {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      void handleDismiss();
    }, 10_000);

    return () => window.clearTimeout(timeout);
  }, [announcement?.id]);

  if (!announcement) {
    return null;
  }

  async function handleDismiss() {
    if (isDismissing) {
      return;
    }

    setIsDismissing(true);
    await onDismiss();
  }

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] w-[calc(100vw-2rem)] max-w-sm">
      <div
        className={cn(
          "pointer-events-auto rounded-xl border bg-background p-4 shadow-2xl transition-all duration-300",
          isVisible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
        )}
        role="status"
        aria-live="polite"
      >
        <div className="mb-3 flex items-start gap-3">
          <div className="rounded-full bg-primary/10 p-2 text-primary">
            <BellRing className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{announcement.subject}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
              {announcement.message}
            </p>
            {queueLength > 1 ? (
              <p className="mt-2 text-xs text-muted-foreground">
                {queueLength - 1} more announcement
                {queueLength > 2 ? "s" : ""} queued
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex justify-end">
          <Button size="sm" onClick={() => void handleDismiss()} disabled={isDismissing}>
            {isDismissing ? "Dismissing..." : "Dismiss"}
          </Button>
        </div>
      </div>
    </div>
  );
}
