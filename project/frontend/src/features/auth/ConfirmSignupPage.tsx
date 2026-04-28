import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Car } from "lucide-react";
import { extractApiError } from "@/api/client";
import { useConfirmSignup, useConfirmSignupSession } from "@/hooks/useAuth";
import { meQueryKey } from "@/hooks/useProfile";
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
        <Car className="mx-auto mb-3 h-10 w-10 text-primary" />
        <h1 className="text-2xl font-bold">Confirm your account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Campus Ride finishes signup after email confirmation.
        </p>
      </div>

      {!tokenHash && !accessToken ? (
        <div className="space-y-4 rounded-md border border-input bg-background p-4 text-sm">
          <p className="text-foreground">
            That confirmation link is missing its token. Open the latest email and use the full link.
          </p>
          <Link to="/auth/register" className="font-medium text-primary hover:underline">
            Back to signup
          </Link>
        </div>
      ) : activeMutation.isPending ? (
        <div className="rounded-md border border-input bg-background px-4 py-6 text-center text-sm text-muted-foreground">
          Confirming your email…
        </div>
      ) : activeMutation.isSuccess ? (
        <div className="space-y-3 rounded-md bg-green-50 px-4 py-6 text-sm text-green-700">
          <p>Your email is confirmed.</p>
          <p>Redirecting you to sign in…</p>
        </div>
      ) : confirmationError ? (
        <div className="space-y-4 rounded-md bg-destructive/10 px-4 py-6 text-sm text-destructive">
          <p>{confirmationError.message}</p>
          <Link to="/auth/register" className="font-medium text-primary hover:underline">
            Start signup again
          </Link>
        </div>
      ) : null}
    </div>
  );
}
