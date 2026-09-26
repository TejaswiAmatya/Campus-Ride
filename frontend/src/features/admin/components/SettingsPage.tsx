import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Settings } from "lucide-react";
import { api } from "@/api/client";
import { FeeEditor } from "./FeeEditor";
import { useAdminConfig } from "../hooks/useAdminConfig";

function isValidFee(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100;
}

export function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: config, isLoading, isError, error } = useAdminConfig();
  const [feeValue, setFeeValue] = useState("10");
  const [formError, setFormError] = useState<string | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  useEffect(() => {
    if (config?.platformFeePercent) {
      setFeeValue(config.platformFeePercent);
    }
  }, [config?.platformFeePercent]);

  useEffect(() => {
    if (!showSuccessToast) {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      setShowSuccessToast(false);
    }, 3000);

    return () => window.clearTimeout(timeout);
  }, [showSuccessToast]);

  const saveFeeMutation = useMutation({
    mutationFn: async (value: string) => {
      const res = await api.patch("/api/admin/config", {
        key: "platformFeePercent",
        value,
      });
      return res.data;
    },
    onSuccess: async () => {
      setFormError(null);
      setShowSuccessToast(true);
      await queryClient.invalidateQueries({ queryKey: ["adminConfig"] });
    },
  });

  const handleSave = () => {
    const trimmedFee = feeValue.trim();

    if (!trimmedFee) {
      setFormError("Enter a platform fee percentage before saving.");
      return;
    }

    if (!isValidFee(trimmedFee)) {
      setFormError("Platform fee must be a number between 0 and 100.");
      return;
    }

    setFormError(null);
    saveFeeMutation.mutate(trimmedFee);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6 text-foreground" />
          <h1 className="font-display text-display-md text-foreground">
            Admin Settings
          </h1>
        </div>
        <div className="h-64 animate-pulse rounded-xl bg-soft" />
      </div>
    );
  }

  if (isError) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to load platform settings right now.";

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6 text-foreground" />
          <h1 className="font-display text-display-md text-foreground">
            Admin Settings
          </h1>
        </div>
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5" />
            <div>
              <p className="font-medium">Failed to load settings.</p>
              <p className="text-destructive/80">{message}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const mutationErrorMessage =
    saveFeeMutation.error instanceof Error
      ? saveFeeMutation.error.message
      : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-6 w-6 text-foreground" />
        <div>
          <h1 className="font-display text-display-md text-foreground">
            Admin Settings
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage platform-wide financial settings used across the app.
          </p>
        </div>
      </div>

      <FeeEditor
        value={feeValue}
        currentValue={config?.platformFeePercent ?? "10"}
        isSaving={saveFeeMutation.isPending}
        errorMessage={formError ?? mutationErrorMessage}
        onChange={setFeeValue}
        onSave={handleSave}
      />

      {showSuccessToast ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed right-4 top-20 z-50 flex items-center gap-3 rounded-xl border-0 bg-success px-4 py-3 text-sm text-success-foreground shadow-elev-2"
        >
          <CheckCircle2 className="h-5 w-5" />
          <span>Platform fee saved successfully.</span>
        </div>
      ) : null}
    </div>
  );
}
