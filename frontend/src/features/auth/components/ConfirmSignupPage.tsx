import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Car } from "lucide-react";
import { extractApiError } from "@/api/client";
import { useConfirmSignup, useConfirmSignupSession } from "@/features/auth/hooks/useAuth";
import { meQueryKey } from "@/features/user/hooks/useProfile";
import { useAuthStore } from "@/store/authStore";

function getHashParam(key: string) {
  if (typeof window === "undefined") {
    return "";
  }

  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;

  return new URLSearchParams(hash).get(key) ?? "";
}

export function ConfirmSignupPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const confirmSignupMutation = useConfirmSignup();
  const confirmSignupSessionMutation = useConfirmSignupSession();
  const clearSession = useAuthStore((state) => state.clearSession);
  const [hasRequestedConfirmation, setHasRequestedConfirmation] = useState(false);

  const tokenHash = useMemo(
    () => searchParams.get("token_hash") ?? searchParams.get("token") ?? "",
    [searchParams],
  );
  const accessToken = useMemo(() => getHashParam("access_token"), []);
  const activeMutation =
    tokenHash.length > 0 ? confirmSignupMutation : confirmSignupSessionMutation;

  useEffect(() => {
    clearSession();
    queryClient.removeQueries({ queryKey: meQueryKey, exact: true });
  }, [clearSession, queryClient]);

  useEffect(() => {
    if ((!tokenHash && !accessToken) || hasRequestedConfirmation) {
      return;
    }

    setHasRequestedConfirmation(true);
    const handleSuccess = ({ email }: { email: string }) => {
      clearSession();
      queryClient.removeQueries({ queryKey: meQueryKey, exact: true });
      window.history.replaceState({}, document.title, "/auth/confirm");
      window.setTimeout(() => {
        navigate(`/auth/login?confirmed=1&email=${encodeURIComponent(email)}`, {
          replace: true,
        });
      }, 1500);
    };

    if (tokenHash) {
      confirmSignupMutation.mutate(
        { tokenHash },
        {
          onSuccess: handleSuccess,
        },
      );
      return;
    }

    confirmSignupSessionMutation.mutate(
      { accessToken },
      {
        onSuccess: handleSuccess,
      },
    );
  }, [
    accessToken,
    clearSession,
    confirmSignupMutation,
    confirmSignupSessionMutation,
    hasRequestedConfirmation,
    navigate,
    queryClient,
    tokenHash,
  ]);

  const confirmationError = activeMutation.isError
    ? extractApiError(activeMutation.error, "We could not confirm that email link. Please request a new signup email.")
    : null;

  return (
    <div className="mx-auto mt-16 max-w-sm px-4">
      <div className="mb-8 text-center">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-pill bg-soft">
          <Car className="h-6 w-6 text-foreground" />
        </span>
        <h1 className="font-display text-display-md text-foreground">Confirm your account</h1>
        <p className="mt-2 text-sm text-mute">
          Campus Ride finishes signup after email confirmation.
        </p>
      </div>

      {!tokenHash && !accessToken ? (
        <div className="space-y-4 rounded-xl bg-soft px-4 py-6 text-sm shadow-elev-2">
          <p className="text-foreground">
            That confirmation link is missing its token. Open the latest email and use the full link.
          </p>
          <Link to="/auth/register" className="font-medium text-foreground hover:underline">
            Back to signup
          </Link>
        </div>
      ) : activeMutation.isPending ? (
        <div className="rounded-xl bg-soft px-4 py-6 text-center text-sm text-mute shadow-elev-2">
          Confirming your email…
        </div>
      ) : activeMutation.isSuccess ? (
        <div className="space-y-3 rounded-xl bg-success/10 px-4 py-6 text-sm text-success">
          <p>Your email is confirmed.</p>
          <p>Redirecting you to sign in…</p>
        </div>
      ) : confirmationError ? (
        <div className="space-y-4 rounded-xl bg-destructive/10 px-4 py-6 text-sm text-destructive">
          <p>{confirmationError.message}</p>
          <Link to="/auth/register" className="font-medium text-foreground hover:underline">
            Start signup again
          </Link>
        </div>
      ) : null}
    </div>
  );
}
