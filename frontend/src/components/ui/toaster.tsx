import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToastStore, type ToastItem } from "@/store/toastStore";

const toneClasses = {
  default: "bg-card text-foreground shadow-elev-2",
  success: "bg-card text-foreground shadow-elev-2 ring-1 ring-success/30",
  error: "bg-card text-foreground shadow-elev-2 ring-1 ring-destructive/30",
} as const;

function ToastCard({ toast }: { toast: ToastItem }) {
  const dismissToast = useToastStore((state) => state.dismissToast);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  async function handleAction(
    label: string,
    action?: () => void | Promise<void>,
  ) {
    if (!action) {
      dismissToast(toast.id);
      return;
    }

    try {
      setPendingAction(label);
      await action();
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div
      className={cn(
        "pointer-events-auto w-full rounded-xl p-4",
        toneClasses[toast.tone ?? "default"],
      )}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{toast.title}</p>
          {toast.description ? (
            <p className="mt-1 text-sm text-muted-foreground">{toast.description}</p>
          ) : null}
        </div>
        <button
          type="button"
          className="rounded-pill p-1 text-mute transition hover:bg-soft hover:text-foreground"
          onClick={() => dismissToast(toast.id)}
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {toast.actions?.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {toast.actions.map((action) => {
            const isPending = pendingAction === action.label;

            return (
              <Button
                key={action.label}
                size="sm"
                variant={action.variant ?? "default"}
                disabled={pendingAction !== null}
                onClick={() => void handleAction(action.label, action.onClick)}
              >
                {isPending ? `${action.label}...` : action.label}
              </Button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function Toaster() {
  const toasts = useToastStore((state) => state.toasts);

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-full max-w-sm flex-col gap-3">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
