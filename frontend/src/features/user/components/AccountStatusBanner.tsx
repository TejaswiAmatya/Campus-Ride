import {
  AlertTriangle,
  Ban,
  CalendarClock,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

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
          "rounded-xl border border-warning/40 bg-warning/10 px-5 py-4",
          className,
        )}
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-full bg-soft p-2 text-foreground">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Account warning</p>
            <p className="text-sm leading-6 text-muted-foreground">
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
          "rounded-xl border border-warning/40 bg-warning/10 px-5 py-4",
          className,
        )}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-full bg-soft p-2 text-foreground">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                Account suspended
              </p>
              <p className="text-sm leading-6 text-muted-foreground">
                Your account is currently suspended. You cannot use ride or
                booking features until the suspension is lifted.
              </p>
            </div>
          </div>

          <Badge variant="warning" className="inline-flex items-center gap-2 self-start">
            <CalendarClock className="h-3.5 w-3.5" />
            {suspendedUntil ? `Suspension ends ${suspensionLabel}` : suspensionLabel}
          </Badge>
        </div>
      </section>
    );
  }

  if (accountStatus === "DEACTIVATED") {
    return (
      <section
        role="alert"
        className={cn(
          "rounded-xl bg-soft px-5 py-4",
          className,
        )}
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-full bg-background p-2 text-foreground">
            <Ban className="h-4 w-4" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Account closed</p>
            <p className="text-sm leading-6 text-muted-foreground">
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
        "rounded-xl border border-destructive/40 bg-destructive/10 px-5 py-4",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-full bg-soft p-2 text-foreground">
          <Ban className="h-4 w-4" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">Account banned</p>
          <p className="text-sm leading-6 text-muted-foreground">
            Your account has been permanently banned for policy violations. You
            no longer have access to ride or booking features.
          </p>
        </div>
      </div>
    </section>
  );
}
