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
    <Card
      className={cn(
        "overflow-hidden rounded-[28px] border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.94))] shadow-[0_24px_80px_-52px_rgba(15,23,42,0.4)]",
        className,
      )}
    >
      <CardHeader className="border-b border-slate-200/80 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.12),transparent_40%),linear-gradient(135deg,rgba(255,255,255,0.96),rgba(241,245,249,0.92))] pb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sky-700">
              <MessageCircleMore className="h-5 w-5" />
              <span className="text-xs font-semibold uppercase tracking-[0.24em]">
                Ride chat
              </span>
            </div>
            <CardTitle className="text-xl text-slate-950">
              Coordinate pickup and timing
            </CardTitle>
            <p className="text-sm text-slate-600">
              Messages stay tied to this ride so drivers and confirmed riders
              can sort out practical details quickly.
            </p>
          </div>

          <div
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium",
              isConnected
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-700",
            )}
          >
            {isConnected ? (
              <Wifi className="h-3.5 w-3.5" />
            ) : (
              <WifiOff className="h-3.5 w-3.5" />
            )}
            {isConnected ? "Live updates on" : "Reconnecting"}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div
          ref={scrollViewportRef}
          className="max-h-[26rem] min-h-[18rem] space-y-4 overflow-y-auto bg-[linear-gradient(180deg,rgba(248,250,252,0.58),rgba(255,255,255,0.96))] px-4 py-4 sm:px-6"
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
                  <div className="h-20 w-full max-w-xs animate-pulse rounded-3xl bg-slate-200/70" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="flex min-h-[14rem] flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-slate-300 bg-white/70 px-6 text-center">
              <MessageCircleMore className="h-8 w-8 text-slate-400" />
              <div className="space-y-1">
                <p className="font-medium text-slate-900">
                  Chat history could not be loaded.
                </p>
                <p className="text-sm text-slate-500">
                  Refresh the page and try again.
                </p>
              </div>
            </div>
          ) : sortedMessages.length === 0 ? (
            <div className="flex min-h-[14rem] flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-slate-300 bg-white/70 px-6 text-center">
              <MessageCircleMore className="h-8 w-8 text-slate-400" />
              <div className="space-y-1">
                <p className="font-medium text-slate-900">
                  No messages yet.
                </p>
                <p className="text-sm text-slate-500">
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
                      <p className="pl-1 text-xs font-medium text-slate-500">
                        {message.senderName}
                      </p>
                    )}

                    <div
                      className={cn(
                        "rounded-[22px] px-4 py-3 shadow-sm",
                        isOwnMessage
                          ? "rounded-br-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white"
                          : "rounded-bl-lg border border-slate-200 bg-white text-slate-900",
                      )}
                    >
                      <p className="whitespace-pre-wrap break-words text-sm leading-6">
                        {message.text}
                      </p>
                    </div>

                    <div
                      className={cn(
                        "px-1 text-[11px]",
                        isOwnMessage ? "text-right text-slate-400" : "text-slate-400",
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
          className="border-t border-slate-200/80 bg-white/95 px-4 py-3 sm:px-6"
        >
          <div className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-1.5 shadow-inner shadow-slate-100">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              rows={2}
              maxLength={1000}
              placeholder="Write a quick update for this ride..."
              className="w-full resize-none border-0 bg-transparent px-3 pb-10 pt-2.5 text-sm leading-5 text-slate-900 outline-none placeholder:text-slate-400"
            />
            <div className="flex items-center justify-between gap-3 border-t border-slate-200/80 px-3 pb-1 pt-1.5">
              <p className="text-xs text-slate-500">
                Press Enter to send
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">
                  {draft.length}/1000
                </span>
                <Button
                  type="submit"
                  disabled={!canSend}
                  size="icon"
                  aria-label="Send message"
                  className="h-8 w-8 rounded-full bg-blue-500 text-white shadow-sm hover:bg-blue-600"
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
        className="h-9 w-9 rounded-full border border-slate-200 object-cover shadow-sm"
      />
    );
  }

  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-xs font-semibold text-slate-600 shadow-sm">
      {getInitials(name)}
    </div>
  );
}
