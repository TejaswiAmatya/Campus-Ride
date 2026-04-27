import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Car } from "lucide-react";
import { getDefaultRoute } from "@/features/auth/routing";
import { useAuth, useLogin } from "@/hooks/useAuth";
import { useAuthStore } from "@/store/authStore";

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
    <div className="mx-auto max-w-sm mt-16 px-4">
      <div className="mb-8 text-center">
        <Car className="mx-auto h-10 w-10 text-primary mb-3" />
        <h1 className="text-2xl font-bold">Welcome back</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Sign in to Campus Ride
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {confirmed && (
          <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
            Your email is confirmed. You can sign in now.
          </p>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">
            University email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@university.edu"
            required
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {authError && (
          <p
            role="alert"
            className={`rounded-md px-3 py-2 text-sm ${
              authError.code === "ACCOUNT_BANNED" ||
              authError.code === "ACCOUNT_SUSPENDED" ||
              authError.code === "ACCOUNT_DEACTIVATED"
                ? "bg-orange-50 text-orange-600"
                : "bg-red-50 text-red-600"
            }`}
          >
            {getModerationMessage(authError)}
          </p>
        )}

        <button
          type="submit"
          disabled={loginMutation.isPending}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {loginMutation.isPending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don't have an account?{" "}
        <Link
          to="/auth/register"
          className="font-medium text-primary hover:underline"
        >
          Create one
        </Link>
      </p>
    </div>
  );
}
