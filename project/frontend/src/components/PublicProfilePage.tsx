import { useMemo } from "react";
import Rating from "@mui/material/Rating";
import { Link, useParams } from "react-router-dom";
import { Star, UserRound } from "lucide-react";
import { VerificationBadge } from "@/components/VerificationBadge";
import { useAuth } from "@/hooks/useAuth";
import { useUserReviews } from "@/hooks/useProfile";

function formatShortId(id: string) {
  return id.slice(0, 8).toUpperCase();
}

export function PublicProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data: reviews = [], isLoading, isError } = useUserReviews(id);

  const isOwnProfile = !!user && user.id === id;

  const averageRating = useMemo(() => {
    if (reviews.length === 0) {
      return 0;
    }

    const total = reviews.reduce((sum, review) => sum + review.rating, 0);
    return total / reviews.length;
  }, [reviews]);

  const profileName = isOwnProfile
    ? user.name
    : `Member ${id ? formatShortId(id) : "Profile"}`;
  const profileSubtitle = isOwnProfile
    ? user.email
    : "Community profile";
  const profileRole = isOwnProfile ? user.role : "PUBLIC";
  const profileAvatar = isOwnProfile ? user.avatarPath : null;
  const profileInitial = (profileName.trim().charAt(0) || "U").toUpperCase();

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

  if (isLoading) {
    return (
      <div className="mx-auto flex min-h-[40vh] max-w-4xl items-center justify-center">
        <p className="animate-pulse text-muted-foreground">Loading profile…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-4xl rounded-3xl border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">
          This profile could not be loaded.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <section className="relative overflow-hidden rounded-[36px] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(240,249,255,0.96)_42%,rgba(248,250,252,0.98))] p-8 shadow-[0_32px_90px_-52px_rgba(15,23,42,0.5)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(249,115,22,0.14),transparent_24%)]"
        />

        <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <div className="inline-flex items-center rounded-full border border-sky-200 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700">
              Public profile
            </div>

            <div className="flex items-start gap-5">
              {profileAvatar ? (
                <img
                  src={profileAvatar}
                  alt={`${profileName} avatar`}
                  className="h-20 w-20 rounded-[24px] object-cover shadow-[0_14px_36px_-22px_rgba(15,23,42,0.55)] ring-1 ring-white/70"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-[linear-gradient(135deg,#0f172a,#0ea5e9)] text-2xl font-semibold text-white shadow-[0_18px_40px_-24px_rgba(15,23,42,0.65)]">
                  {profileInitial}
                </div>
              )}

              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                  {profileName}
                </h1>
                <VerificationBadge
                  academicRole={isOwnProfile ? user.academicRole : null}
                  academicVerificationStatus={
                    isOwnProfile
                      ? user.academicVerificationStatus
                      : "NOT_SUBMITTED"
                  }
                />
                <p className="text-sm text-slate-600">{profileSubtitle}</p>
                <div className="flex flex-wrap items-center gap-3 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                  <span className="rounded-full border border-slate-200 bg-white/90 px-3 py-1">
                    {profileRole}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-white/90 px-3 py-1">
                    ID {formatShortId(id)}
                  </span>
                </div>
              </div>
            </div>

            <p className="max-w-2xl text-sm leading-7 text-slate-600">
              A live public snapshot of ride feedback received from other members.
              Ratings and comments are calculated directly from published reviews.
            </p>
          </div>

          <div className="rounded-[28px] border border-slate-200/90 bg-white/80 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
            <div className="space-y-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Reputation
                </p>
                <div className="mt-3 flex items-end gap-3">
                  <span className="text-5xl font-semibold leading-none text-slate-950">
                    {reviews.length === 0 ? "0.0" : averageRating.toFixed(1)}
                  </span>
                  <span className="pb-1 text-sm text-slate-500">out of 5</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Rating
                  name="half-rating-read"
                  defaultValue={2.5}
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

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Average rating
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">
                    {reviews.length === 0 ? "No ratings" : averageRating.toFixed(1)}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Feedback count
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">
                    {reviews.length}
                  </p>
                </div>
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
          <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50/70 p-10 text-center">
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
                className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_-40px_rgba(15,23,42,0.45)]"
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
                        name="half-rating-read"
                        defaultValue={2.5}
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
