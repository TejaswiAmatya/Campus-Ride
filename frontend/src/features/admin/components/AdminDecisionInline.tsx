import { useState } from "react";

import { Button } from "@/components/ui/button";

interface AdminDecisionInlineProps {
  isPending?: boolean;
  onApprove: () => void;
  onReject: (reason: string) => void;
}

export function AdminDecisionInline({
  isPending = false,
  onApprove,
  onReject,
}: AdminDecisionInlineProps) {
  const [reason, setReason] = useState("");
  const trimmedReason = reason.trim();

  return (
    <div className="space-y-3">
      <textarea
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        rows={3}
        placeholder="Reason for rejection"
        className="w-full rounded-md border-0 bg-soft px-4 py-3 text-sm text-foreground placeholder:text-mute focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />

      <div className="flex gap-2">
        <Button type="button" onClick={onApprove} disabled={isPending}>
          Approve
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => onReject(trimmedReason)}
          disabled={isPending || trimmedReason.length === 0}
        >
          Reject
        </Button>
      </div>
    </div>
  );
}
