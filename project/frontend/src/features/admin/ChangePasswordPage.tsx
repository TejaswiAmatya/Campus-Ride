import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { KeyRound } from "lucide-react";
import { api } from "@/api/client";
import { useAuthStore } from "@/store/authStore";

type ChangePasswordResponse = {
  message: string;
};

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const setUser = useAuthStore((state) => state.setUser);

  const changePasswordMutation = useMutation({
    mutationFn: async (password: string) => {
      const res = await api.patch<ChangePasswordResponse>(
        "/api/admin/change-password",
        { newPassword: password },
      );
      return res.data;
    },
    onSuccess: () => {
      const currentUser = useAuthStore.getState().user;
      if (currentUser) {
        setUser({ ...currentUser, mustChangePassword: false });
      }
      navigate("/admin", { replace: true });
    },
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const trimmedPassword = newPassword.trim();
    if (trimmedPassword.length < 8) {
      setFormError("Password must be at least 8 characters.");
      return;
    }

    if (trimmedPassword !== confirmPassword.trim()) {
      setFormError("Passwords do not match.");
      return;
    }

    changePasswordMutation.mutate(trimmedPassword);
  };

  const mutationErrorMessage =
    changePasswordMutation.error instanceof Error
      ? changePasswordMutation.error.message
      : "Unable to update password right now. Please try again.";

  return (
    <div className="mx-auto mt-16 max-w-sm px-4">
      <div className="mb-8 text-center">
        <KeyRound className="mx-auto mb-3 h-10 w-10 text-primary" />
        <h1 className="text-2xl font-bold">Change password</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          You must set a new password before accessing admin pages.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="new-password" className="mb-1 block text-sm font-medium">
            New password
          </label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder="At least 8 characters"
            minLength={8}
            required
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label
            htmlFor="confirm-password"
            className="mb-1 block text-sm font-medium"
          >
            Confirm password
          </label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {formError ? (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {formError}
          </p>
        ) : null}

        {changePasswordMutation.isError ? (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {mutationErrorMessage}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={changePasswordMutation.isPending}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {changePasswordMutation.isPending
            ? "Updating password..."
            : "Update password"}
        </button>
      </form>
    </div>
  );
}
