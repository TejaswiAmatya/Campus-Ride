import { useMemo } from "react";
import axios from "axios";
import Rating from "@mui/material/Rating";
import { Link, useParams } from "react-router-dom";
import { Star, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
      <div className="mx-auto max-w-4xl rounded-xl border border-dashed border-border p-8 text-center">
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
        <div className="mx-auto max-w-4xl rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            This profile is no longer available.
          </p>
        </div>
      );
    }

    return (
      <div className="mx-auto max-w-4xl rounded-xl border border-dashed border-border p-8 text-center">
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
      <div className="mx-auto max-w-4xl rounded-xl border border-dashed border-border p-8 text-center">
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
      <section className="overflow-hidden rounded-xl bg-card">
        <div className="border-b border-border bg-soft px-6 py-3">
          <p className="text-xs font-medium text-muted-foreground">
            Public profile
          </p>
        </div>

        <div className="space-y-6 p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-start">
            {profile.avatarPath ? (
              <img
                src={profile.avatarPath}
                alt={`${profile.name} avatar`}
                className="h-24 w-24 rounded-xl object-cover"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-xl bg-primary font-display text-4xl font-semibold text-primary-foreground">
                {profileInitial}
              </div>
            )}

            <div className="min-w-0 flex-1 space-y-3">
              <div className="space-y-2">
                <h1 className="font-display text-display-lg text-foreground">
                  {profile.name}
                </h1>
                <VerificationBadge
                  academicRole={profile.academicRole}
                  academicVerificationStatus={
                    profile.academicVerificationStatus
                  }
                />
                <p className="text-sm text-muted-foreground">
                  Public ride feedback and reputation summary.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{roleLabel}</Badge>
                <Badge variant="outline">ID {formatShortId(id)}</Badge>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-xl bg-soft p-5">
              <p className="text-xs font-medium text-muted-foreground">
                Reputation
              </p>
              <div className="mt-4 flex items-end gap-3">
                <span className="font-display text-display-xl leading-none text-foreground">
                  {reviews.length === 0 ? "0.0" : averageRating.toFixed(1)}
                </span>
                <span className="pb-1 text-sm text-muted-foreground">out of 5</span>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <Rating
                  name="public-profile-rating"
                  precision={0.5}
                  value={averageRating}
                  readOnly
                  sx={{
                    color: "#000000",
                    "& .MuiRating-iconEmpty": {
                      color: "rgba(175, 175, 175, 0.5)",
                    },
                  }}
                />
                <span className="text-sm text-muted-foreground">
                  {reviews.length} review{reviews.length === 1 ? "" : "s"}
                </span>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-soft p-5">
                <p className="text-xs font-medium text-muted-foreground">
                  Average rating
                </p>
                <p className="mt-4 font-display text-display-md text-foreground">
                  {reviews.length === 0 ? "No ratings" : averageRating.toFixed(1)}
                </p>
              </div>

              <div className="rounded-xl bg-soft p-5">
                <p className="text-xs font-medium text-muted-foreground">
                  Feedback count
                </p>
                <p className="mt-4 font-display text-display-md text-foreground">
                  {reviews.length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-soft text-foreground">
            <Star className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-display text-display-md text-foreground">
              Received reviews
            </h2>
            <p className="text-sm text-muted-foreground">
              Comments left by other riders and drivers.
            </p>
          </div>
        </div>

        {reviews.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-soft p-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-card text-mute">
              <UserRound className="h-6 w-6" />
            </div>
            <p className="mt-4 text-base font-medium text-foreground">
              No reviews yet
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              This profile has not received any public ride feedback yet.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {reviews.map((review) => (
              <article
                key={review.id}
                className="rounded-xl bg-card p-6"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      {review.reviewer.avatarPath ? (
                        <img
                          src={review.reviewer.avatarPath}
                          alt={`${review.reviewer.name} avatar`}
                          className="h-11 w-11 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-soft text-sm font-semibold text-foreground">
                          {(review.reviewer.name.trim().charAt(0) || "R").toUpperCase()}
                        </div>
                      )}

                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {review.reviewer.name}
                        </p>
                        <p className="text-xs text-mute">
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
                          color: "#000000",
                          "& .MuiRating-iconEmpty": {
                            color: "rgba(175, 175, 175, 0.5)",
                          },
                        }}
                      />
                      <span className="text-sm font-medium text-foreground">
                        {review.rating.toFixed(1).replace(".0", "")}/5
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-mute">
                    {new Date(review.createdAt).toLocaleDateString("en-GB")}
                  </p>
                </div>

                {review.comment && (
                  <p className="mt-4 text-sm leading-7 text-muted-foreground">
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
