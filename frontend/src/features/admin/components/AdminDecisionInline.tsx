import { useState } from "react";

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
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
      />

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onApprove}
          disabled={isPending}
          className="rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          Approve
        </button>
        <button
          type="button"
          onClick={() => onReject(trimmedReason)}
          disabled={isPending || trimmedReason.length === 0}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50 disabled:opacity-50"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
