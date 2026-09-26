import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { MessageCircleMore, SendHorizonal, Wifi, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { useRideChat } from "../hooks/useRideChat";
import type { ChatParticipantSummary } from "../types";

function formatMessageTime(timestamp: string) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

interface RideChatPanelProps {
  rideId: string;
  currentUserId: string;
  knownParticipants?: ChatParticipantSummary[];
  className?: string;
}

export function RideChatPanel({
  rideId,
  currentUserId,
  knownParticipants = [],
  className,
}: RideChatPanelProps) {
  const [draft, setDraft] = useState("");
  const scrollViewportRef = useRef<HTMLDivElement | null>(null);
  const { messages, isLoading, isError, isConnected, sendMessage } =
    useRideChat({
      rideId,
      enabled: true,
      knownParticipants,
    });

  const trimmedDraft = draft.trim();
  const canSend = isConnected && trimmedDraft.length > 0;
  const sortedMessages = useMemo(() => messages, [messages]);

  useEffect(() => {
    const viewport = scrollViewportRef.current;
    if (!viewport) {
      return;
    }

    viewport.scrollTop = viewport.scrollHeight;
  }, [sortedMessages.length]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSend) {
      return;
    }

    const sent = sendMessage(trimmedDraft);
    if (sent) {
      setDraft("");
    }
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (canSend) {
        const sent = sendMessage(trimmedDraft);
        if (sent) {
          setDraft("");
        }
      }
    }
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="border-b border-border bg-soft pb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-foreground">
              <MessageCircleMore className="h-5 w-5" />
              <span className="text-xs font-medium text-mute">
                Ride chat
              </span>
            </div>
            <CardTitle className="text-display-sm">
              Coordinate pickup and timing
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Messages stay tied to this ride so drivers and confirmed riders
              can sort out practical details quickly.
            </p>
          </div>

          <Badge variant={isConnected ? "success" : "warning"} className="gap-2">
            {isConnected ? (
              <Wifi className="h-3.5 w-3.5" />
            ) : (
              <WifiOff className="h-3.5 w-3.5" />
            )}
            {isConnected ? "Live updates on" : "Reconnecting"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div
          ref={scrollViewportRef}
          className="max-h-[26rem] min-h-[18rem] space-y-4 overflow-y-auto bg-background px-4 py-4 sm:px-6"
        >
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex gap-3",
                    index % 2 === 0 ? "justify-start" : "justify-end",
                  )}
                >
                  <div className="h-20 w-full max-w-xs animate-pulse rounded-xl bg-soft" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="flex min-h-[14rem] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-soft px-6 text-center">
              <MessageCircleMore className="h-8 w-8 text-mute" />
              <div className="space-y-1">
                <p className="font-medium text-foreground">
                  Chat history could not be loaded.
                </p>
                <p className="text-sm text-muted-foreground">
                  Refresh the page and try again.
                </p>
              </div>
            </div>
          ) : sortedMessages.length === 0 ? (
            <div className="flex min-h-[14rem] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-soft px-6 text-center">
              <MessageCircleMore className="h-8 w-8 text-mute" />
              <div className="space-y-1">
                <p className="font-medium text-foreground">
                  No messages yet.
                </p>
                <p className="text-sm text-muted-foreground">
                  Start with pickup details, arrival timing, or a simple heads-up.
                </p>
              </div>
            </div>
          ) : (
            sortedMessages.map((message) => {
              const isOwnMessage = message.senderId === currentUserId;

              return (
                <div
                  key={`${message.rideId}:${message.senderId}:${message.createdAt}:${message.text}`}
                  className={cn(
                    "flex items-end gap-3",
                    isOwnMessage ? "justify-end" : "justify-start",
                  )}
                >
                  {!isOwnMessage && (
                    <MessageAvatar
                      name={message.senderName}
                      avatarPath={message.senderAvatarPath}
                    />
                  )}

                  <div
                    className={cn(
                      "max-w-[85%] space-y-1.5 sm:max-w-[75%]",
                      isOwnMessage ? "text-right" : "text-left",
                    )}
                  >
                    {!isOwnMessage && (
                      <p className="pl-1 text-xs font-medium text-muted-foreground">
                        {message.senderName}
                      </p>
                    )}

                    <div
                      className={cn(
                        "rounded-xl px-4 py-3",
                        isOwnMessage
                          ? "bg-primary text-primary-foreground"
                          : "bg-soft text-foreground",
                      )}
                    >
                      <p className="whitespace-pre-wrap break-words text-sm leading-6">
                        {message.text}
                      </p>
                    </div>

                    <div
                      className={cn(
                        "px-1 text-xs text-mute",
                        isOwnMessage ? "text-right" : "",
                      )}
                    >
                      {formatMessageTime(message.createdAt)}
                    </div>
                  </div>

                  {isOwnMessage && (
                    <MessageAvatar
                      name={message.senderName}
                      avatarPath={message.senderAvatarPath}
                    />
                  )}
                </div>
              );
            })
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="border-t border-border bg-background px-4 py-3 sm:px-6"
        >
          <div className="rounded-xl bg-soft p-1.5">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              rows={2}
              maxLength={1000}
              placeholder="Write a quick update for this ride..."
              className="w-full resize-none border-0 bg-transparent px-3 pb-10 pt-2.5 text-sm leading-5 text-foreground outline-none placeholder:text-mute"
            />
            <div className="flex items-center justify-between gap-3 border-t border-border px-3 pb-1 pt-1.5">
              <p className="text-xs text-muted-foreground">
                Press Enter to send
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-mute">
                  {draft.length}/1000
                </span>
                <Button
                  type="submit"
                  disabled={!canSend}
                  size="icon"
                  aria-label="Send message"
                >
                  <SendHorizonal className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function MessageAvatar({
  name,
  avatarPath,
}: {
  name: string;
  avatarPath: string | null;
}) {
  if (avatarPath) {
    return (
      <img
        src={avatarPath}
        alt={name}
        className="h-9 w-9 rounded-full object-cover"
      />
    );
  }

  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-soft text-xs font-medium text-muted-foreground">
      {getInitials(name)}
    </div>
  );
}
