import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Car } from "lucide-react";
import { extractApiError } from "@/api/client";
import { useConfirmSignup } from "@/hooks/useAuth";

export function ConfirmSignupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const confirmSignupMutation = useConfirmSignup();
  const [hasRequestedConfirmation, setHasRequestedConfirmation] = useState(false);

  const tokenHash = useMemo(
    () => searchParams.get("token_hash") ?? searchParams.get("token") ?? "",
    [searchParams],
  );

  useEffect(() => {
    if (!tokenHash || hasRequestedConfirmation) {
      return;
    }

    setHasRequestedConfirmation(true);
    confirmSignupMutation.mutate(
      { tokenHash },
      {
        onSuccess: ({ email }) => {
          window.history.replaceState({}, document.title, "/auth/confirm");
          window.setTimeout(() => {
            navigate(`/auth/login?confirmed=1&email=${encodeURIComponent(email)}`, {
              replace: true,
            });
          }, 1500);
        },
      },
    );
  }, [confirmSignupMutation, hasRequestedConfirmation, navigate, tokenHash]);

  const confirmationError = confirmSignupMutation.isError
    ? extractApiError(confirmSignupMutation.error, "We could not confirm that email link. Please request a new signup email.")
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

      {!tokenHash ? (
        <div className="space-y-4 rounded-md border border-input bg-background p-4 text-sm">
          <p className="text-foreground">
            That confirmation link is missing its token. Open the latest email and use the full link.
          </p>
          <Link to="/auth/register" className="font-medium text-primary hover:underline">
            Back to signup
          </Link>
        </div>
      ) : confirmSignupMutation.isPending ? (
        <div className="rounded-md border border-input bg-background px-4 py-6 text-center text-sm text-muted-foreground">
          Confirming your email…
        </div>
      ) : confirmSignupMutation.isSuccess ? (
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
