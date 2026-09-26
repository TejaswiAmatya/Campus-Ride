import { useMemo } from "react";
import axios from "axios";
import Rating from "@mui/material/Rating";
import { Link, useParams } from "react-router-dom";
import { Star, UserRound } from "lucide-react";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { VerificationBadge } from "@/features/user/components/VerificationBadge";
import { usePublicUserProfile, useUserReviews } from "@/features/user/hooks/useProfile";

function formatShortId(id: string) {
  return id.slice(0, 8).toUpperCase();
}

export function PublicProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const isOwnProfile = !!user && user.id === id;
  const {
    data: publicProfile,
    isLoading: isLoadingProfile,
    isError: isProfileError,
    error: profileError,
  } = usePublicUserProfile(!isOwnProfile ? id : undefined);
  const {
    data: reviews = [],
    isLoading: isLoadingReviews,
    isError: isReviewsError,
    error: reviewsError,
  } = useUserReviews(id);

  const averageRating = useMemo(() => {
    if (reviews.length === 0) {
      return 0;
    }

    const total = reviews.reduce((sum, review) => sum + review.rating, 0);
    return total / reviews.length;
  }, [reviews]);

  if (!id) {
    return (
      <div className="mx-auto max-w-4xl rounded-3xl border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">Profile not found.</p>
        <Link
          to="/rides"
          className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
        >
          Back to rides
        </Link>
      </div>
    );
  }

  if (isLoadingProfile || isLoadingReviews) {
    return (
      <div className="mx-auto flex min-h-[40vh] max-w-5xl items-center justify-center">
        <p className="animate-pulse text-muted-foreground">Loading profile…</p>
      </div>
    );
  }

  const combinedError = profileError ?? reviewsError;
  if (isProfileError || isReviewsError) {
    if (
      axios.isAxiosError<{ error?: { code?: string } }>(combinedError) &&
      combinedError.response?.data?.error?.code === "ACCOUNT_DEACTIVATED"
    ) {
      return (
        <div className="mx-auto max-w-4xl rounded-3xl border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            This profile is no longer available.
          </p>
        </div>
      );
    }

    return (
      <div className="mx-auto max-w-4xl rounded-3xl border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">
          This profile could not be loaded.
        </p>
      </div>
    );
  }

  const profile = isOwnProfile
    ? {
        name: user.name,
        avatarPath: user.avatarPath ?? null,
        role: user.role,
        academicRole: user.academicRole,
        academicVerificationStatus: user.academicVerificationStatus,
      }
    : publicProfile;

  if (!profile) {
    return (
      <div className="mx-auto max-w-4xl rounded-3xl border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">Profile not found.</p>
      </div>
    );
  }

  const profileInitial = (profile.name.trim().charAt(0) || "U").toUpperCase();
  const roleLabel =
    profile.role === "DRIVER"
      ? "Driver"
      : profile.role === "ADMIN"
        ? "Admin"
        : "Passenger";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="overflow-hidden rounded-3xl border bg-gradient-to-r from-sky-50 via-white to-emerald-50">
        <div className="border-b border-slate-200/80 px-6 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
            Public profile
          </p>
        </div>

        <div className="space-y-6 p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-start">
            {profile.avatarPath ? (
              <img
                src={profile.avatarPath}
                alt={`${profile.name} avatar`}
                className="h-24 w-24 rounded-3xl object-cover ring-1 ring-slate-200"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-slate-900 text-4xl font-semibold text-white">
                {profileInitial}
              </div>
            )}

            <div className="min-w-0 flex-1 space-y-3">
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                  {profile.name}
                </h1>
                <VerificationBadge
                  academicRole={profile.academicRole}
                  academicVerificationStatus={
                    profile.academicVerificationStatus
                  }
                />
                <p className="text-sm text-slate-600">
                  Public ride feedback and reputation summary.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                <span className="rounded-full border bg-white px-3 py-1">
                  {roleLabel}
                </span>
                <span className="rounded-full border bg-white px-3 py-1">
                  ID {formatShortId(id)}
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Reputation
              </p>
              <div className="mt-4 flex items-end gap-3">
                <span className="text-5xl font-semibold leading-none text-slate-950">
                  {reviews.length === 0 ? "0.0" : averageRating.toFixed(1)}
                </span>
                <span className="pb-1 text-sm text-slate-500">out of 5</span>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <Rating
                  name="public-profile-rating"
                  precision={0.5}
                  value={averageRating}
                  readOnly
                  sx={{
                    color: "#0f172a",
                    "& .MuiRating-iconEmpty": {
                      color: "rgba(148, 163, 184, 0.35)",
                    },
                  }}
                />
                <span className="text-sm text-slate-600">
                  {reviews.length} review{reviews.length === 1 ? "" : "s"}
                </span>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Average rating
                </p>
                <p className="mt-4 text-3xl font-semibold text-slate-950">
                  {reviews.length === 0 ? "No ratings" : averageRating.toFixed(1)}
                </p>
              </div>

              <div className="rounded-2xl border bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Feedback count
                </p>
                <p className="mt-4 text-3xl font-semibold text-slate-950">
                  {reviews.length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <Star className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
              Received reviews
            </h2>
            <p className="text-sm text-slate-600">
              Comments left by other riders and drivers.
            </p>
          </div>
        </div>

        {reviews.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-slate-50/70 p-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm">
              <UserRound className="h-6 w-6" />
            </div>
            <p className="mt-4 text-base font-medium text-slate-900">
              No reviews yet
            </p>
            <p className="mt-2 text-sm text-slate-500">
              This profile has not received any public ride feedback yet.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {reviews.map((review) => (
              <article
                key={review.id}
                className="rounded-2xl border bg-white p-6 shadow-sm"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      {review.reviewer.avatarPath ? (
                        <img
                          src={review.reviewer.avatarPath}
                          alt={`${review.reviewer.name} avatar`}
                          className="h-11 w-11 rounded-2xl object-cover"
                        />
                      ) : (
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-sm font-semibold text-slate-700">
                          {(review.reviewer.name.trim().charAt(0) || "R").toUpperCase()}
                        </div>
                      )}

                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {review.reviewer.name}
                        </p>
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                          Ride {formatShortId(review.rideId)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Rating
                        name={`review-rating-${review.id}`}
                        precision={0.5}
                        value={review.rating}
                        readOnly
                        sx={{
                          color: "#f59e0b",
                          "& .MuiRating-iconEmpty": {
                            color: "rgba(148, 163, 184, 0.35)",
                          },
                        }}
                      />
                      <span className="text-sm font-medium text-slate-700">
                        {review.rating.toFixed(1).replace(".0", "")}/5
                      </span>
                    </div>
                  </div>

                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                    {new Date(review.createdAt).toLocaleDateString("en-GB")}
                  </p>
                </div>

                {review.comment && (
                  <p className="mt-4 text-sm leading-7 text-slate-600">
                    {review.comment}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
