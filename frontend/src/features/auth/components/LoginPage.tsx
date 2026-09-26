import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Car } from "lucide-react";
import { AuthPageLayout } from "@/features/auth/components/AuthPageLayout";
import { useAuth, useLogin } from "@/features/auth/hooks/useAuth";
import { getDefaultRoute } from "@/features/auth/lib/routing";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function getModerationMessage(
  authError: {
    code: string;
    message: string;
    suspendedUntil?: string | null;
  },
) {
  if (authError.code === "ACCOUNT_BANNED") {
    return "Your account has been permanently banned. Contact support.";
  }

  if (authError.code === "ACCOUNT_DEACTIVATED") {
    return "This account has been closed and is no longer available.";
  }

  if (authError.code === "ACCOUNT_SUSPENDED" && authError.suspendedUntil) {
    return `Your account is suspended until ${new Date(
      authError.suspendedUntil,
    ).toLocaleDateString()}.`;
  }

  if (authError.code === "ACCOUNT_SUSPENDED") {
    return "Your account is suspended indefinitely. Contact support.";
  }

  if (authError.code === "INVALID_CREDENTIALS") {
    return "Invalid email or password.";
  }

  if (authError.code === "EMAIL_NOT_CONFIRMED") {
    return "Please confirm your email before signing in.";
  }

  return "Something went wrong. Please try again.";
}

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isLoading } = useAuth();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const loginMutation = useLogin();
  const authError = useAuthStore((state) => state.authError);
  const confirmed = searchParams.get("confirmed") === "1";

  useEffect(() => {
    if (!isLoading && user) {
      navigate(getDefaultRoute(user), { replace: true });
    }
  }, [isLoading, navigate, user]);

  useEffect(() => {
    const nextEmail = searchParams.get("email") ?? "";
    setEmail(nextEmail);
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // validate the form
    loginMutation.mutate({ email, password });
  };

  return (
    <AuthPageLayout>
      <div className="mb-8 flex flex-col items-center gap-4 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-pill bg-background">
          <Car className="h-6 w-6 text-foreground" />
        </span>
        <h1 className="font-display text-display-md text-foreground">Welcome back</h1>
        <p className="text-sm text-mute">Sign in to Campus Ride</p>
      </div>

      <form onSubmit={handleSubmit} className="mx-auto w-[95%] space-y-4">
        {confirmed && (
          <p className="rounded-xl bg-success/10 px-3 py-2 text-sm text-success">
            Your email is confirmed. You can sign in now.
          </p>
        )}

        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-foreground">
            University email
          </label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@university.edu"
            required
            className="bg-softer"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-foreground">
            Password
          </label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="bg-softer"
          />
        </div>

        {authError && (
          <p
            role="alert"
            className={`rounded-xl px-3 py-2 text-sm ${
              authError.code === "ACCOUNT_BANNED" ||
              authError.code === "ACCOUNT_SUSPENDED" ||
              authError.code === "ACCOUNT_DEACTIVATED"
                ? "bg-warning/15 text-warning-foreground"
                : "bg-destructive/10 text-destructive"
            }`}
          >
            {getModerationMessage(authError)}
          </p>
        )}

        <Button type="submit" disabled={loginMutation.isPending} className="w-full">
          {loginMutation.isPending ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-mute">
        Don't have an account?{" "}
        <Link to="/auth/register" className="font-medium text-foreground hover:underline">
          Create one
        </Link>
      </p>
    </AuthPageLayout>
  );
}
