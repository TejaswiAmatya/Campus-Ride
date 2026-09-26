import {
  AlertTriangle,
  Ban,
  CalendarClock,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";

type AccountStatus =
  | "ACTIVE"
  | "WARNED"
  | "SUSPENDED"
  | "BANNED"
  | "DEACTIVATED";

interface AccountStatusBannerProps {
  accountStatus: AccountStatus;
  suspendedUntil?: string | null;
  className?: string;
}

function formatSuspendedUntil(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "long",
    timeStyle: "short",
  }).format(date);
}

export function AccountStatusBanner({
  accountStatus,
  suspendedUntil = null,
  className,
}: AccountStatusBannerProps) {
  if (accountStatus === "ACTIVE") {
    return null;
  }

  if (accountStatus === "WARNED") {
    return (
      <section
        role="status"
        className={cn(
          "relative overflow-hidden rounded-2xl border border-amber-300/80 bg-gradient-to-br from-amber-50 via-white to-orange-50 px-5 py-4 shadow-[0_18px_40px_-28px_rgba(180,83,9,0.55)]",
          className,
        )}
      >
        <div className="absolute inset-y-0 left-0 w-1.5 bg-amber-500" />
        <div className="relative flex items-start gap-3">
          <div className="mt-0.5 rounded-full bg-amber-100 p-2 text-amber-700">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-700">
              Account warning
            </p>
            <p className="text-sm leading-6 text-stone-800">
              Your account has been warned. Further policy violations can lead
              to a temporary suspension or a permanent ban.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (accountStatus === "SUSPENDED") {
    const suspensionLabel = suspendedUntil
      ? formatSuspendedUntil(suspendedUntil)
      : "temporarily suspended";

    return (
      <section
        role="alert"
        className={cn(
          "relative overflow-hidden rounded-2xl border border-orange-300/90 bg-[linear-gradient(135deg,rgba(255,247,237,1),rgba(255,255,255,0.96)_45%,rgba(255,237,213,0.92))] px-5 py-4 shadow-[0_20px_45px_-30px_rgba(194,65,12,0.6)]",
          className,
        )}
      >
        <div className="absolute inset-y-0 left-0 w-2 bg-orange-500" />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-full bg-orange-100 p-2 text-orange-700">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-700">
                Account suspended
              </p>
              <p className="text-sm leading-6 text-stone-900">
                Your account is currently suspended. You cannot use ride or
                booking features until the suspension is lifted.
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 self-start rounded-full border border-orange-200 bg-white/80 px-3 py-1.5 text-xs font-medium text-orange-800 backdrop-blur">
            <CalendarClock className="h-3.5 w-3.5" />
            {suspendedUntil ? `Suspension ends ${suspensionLabel}` : suspensionLabel}
          </div>
        </div>
      </section>
    );
  }

  if (accountStatus === "DEACTIVATED") {
    return (
      <section
        role="alert"
        className={cn(
          "relative overflow-hidden rounded-2xl border border-slate-300/90 bg-[linear-gradient(135deg,rgba(248,250,252,1),rgba(255,255,255,0.96)_40%,rgba(241,245,249,0.96))] px-5 py-4 shadow-[0_20px_44px_-32px_rgba(15,23,42,0.45)]",
          className,
        )}
      >
        <div className="absolute inset-y-0 left-0 w-2 bg-slate-500" />
        <div className="relative flex items-start gap-3">
          <div className="mt-0.5 rounded-full bg-slate-100 p-2 text-slate-700">
            <Ban className="h-4 w-4" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-700">
              Account closed
            </p>
            <p className="text-sm leading-6 text-slate-900">
              This account has been closed and can no longer access ride or
              booking features.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      role="alert"
      className={cn(
        "relative overflow-hidden rounded-2xl border border-rose-300/90 bg-[linear-gradient(135deg,rgba(255,241,242,1),rgba(255,255,255,0.94)_40%,rgba(254,226,226,0.95))] px-5 py-4 shadow-[0_22px_50px_-32px_rgba(159,18,57,0.7)]",
        className,
      )}
    >
      <div className="absolute inset-y-0 left-0 w-2 bg-rose-600" />
      <div className="relative flex items-start gap-3">
        <div className="mt-0.5 rounded-full bg-rose-100 p-2 text-rose-700">
          <Ban className="h-4 w-4" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-rose-700">
            Account banned
          </p>
          <p className="text-sm leading-6 text-stone-900">
            Your account has been permanently banned for policy violations. You
            no longer have access to ride or booking features.
          </p>
        </div>
      </div>
    </section>
  );
}
