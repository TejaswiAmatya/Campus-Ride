import { useMemo, useState, type ReactNode } from "react";
import Rating from "@mui/material/Rating";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useCreateRideReview } from "@/hooks/useProfile";

type LeaveReviewSectionProps = {
  rideId: string;
  revieweeId: string;
  revieweeName?: string;
  revieweeProfileHref?: string;
  title?: ReactNode;
  description?: ReactNode;
  submitLabel?: string;
  onSubmitted?: () => void;
};

export function LeaveReviewSection({
  rideId,
  revieweeId,
  revieweeName,
  revieweeProfileHref,
  title = "Leave a review",
  description = "Share a short, honest note about how the ride went.",
  submitLabel = "Submit review",
  onSubmitted,
}: LeaveReviewSectionProps) {
  const [rating, setRating] = useState<number | null>(2.5);
  const [comment, setComment] = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const createReview = useCreateRideReview(rideId);

  const roundedRating = useMemo(() => {
    if (!rating) return null;
    return Math.min(5, Math.max(1, Math.round(rating)));
  }, [rating]);

  const helperText = useMemo(() => {
    if (rating === null) {
      return "Pick a rating before submitting.";
    }

    if (roundedRating === rating) {
      return `${rating.toFixed(1).replace(".0", "")}/5 selected`;
    }

    return `${rating.toFixed(1)}/5 selected, submitted as ${roundedRating}/5`;
  }, [rating, roundedRating]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!roundedRating) {
      return;
    }

    await createReview.mutateAsync({
      revieweeId,
      rating: roundedRating,
      comment: comment.trim() || undefined,
    });

    setHasSubmitted(true);
    onSubmitted?.();
  }

  function handleRatingChange(_event: React.SyntheticEvent, value: number | null) {
    if (hasSubmitted) {
      return;
    }

    if (createReview.isSuccess || createReview.isError) {
      createReview.reset();
    }

    setRating(value);
  }

  function handleCommentChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    if (hasSubmitted) {
      return;
    }

    if (createReview.isSuccess || createReview.isError) {
      createReview.reset();
    }

    setComment(event.target.value);
  }

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(244,247,255,0.96))] p-6 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.45)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.16),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(249,115,22,0.14),transparent_28%)]"
      />

      <div className="relative space-y-6">
        <div className="space-y-2">
          <div className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-700">
            Ride feedback
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-semibold tracking-tight text-slate-950">
              {title}
            </h3>
            <p className="max-w-xl text-sm leading-6 text-slate-600">
              {description}
              {revieweeName && (
                <>
                  {" "}
                  Reviewing{" "}
                  {revieweeProfileHref ? (
                    <Link
                      to={revieweeProfileHref}
                      className="font-medium text-slate-900 underline decoration-sky-300 underline-offset-4 transition hover:text-sky-700"
                    >
                      {revieweeName}
                    </Link>
                  ) : (
                    <span className="font-medium text-slate-900">
                      {revieweeName}
                    </span>
                  )}
                  .
                </>
              )}
            </p>
          </div>
        </div>

        {hasSubmitted ? (
          <div className="rounded-[24px] border border-emerald-200 bg-emerald-50/90 p-5 text-sm text-emerald-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-medium">
                You already reviewed this user for this ride.
              </p>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                  Submitted
                </span>
                <Rating
                  name="half-rating-read"
                  defaultValue={2.5}
                  precision={0.5}
                  value={rating}
                  readOnly
                  sx={{
                    color: "#047857",
                    "& .MuiRating-iconEmpty": {
                      color: "rgba(110, 231, 183, 0.35)",
                    },
                  }}
                />
              </div>
            </div>
          </div>
        ) : (
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="rounded-[24px] border border-slate-200/90 bg-white/90 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-900">Your rating</p>
                  <Rating
                    name="half-rating"
                    defaultValue={2.5}
                    precision={0.5}
                    value={rating}
                    onChange={handleRatingChange}
                    sx={{
                      fontSize: "2.2rem",
                      color: "#f59e0b",
                      "& .MuiRating-iconEmpty": {
                        color: "rgba(148, 163, 184, 0.35)",
                      },
                    }}
                  />
                  <p className="text-xs text-slate-500">{helperText}</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Preview
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    <Rating
                      name="half-rating-read"
                      defaultValue={2.5}
                      precision={0.5}
                      value={rating}
                      readOnly
                      sx={{
                        color: "#0f172a",
                        "& .MuiRating-iconEmpty": {
                          color: "rgba(148, 163, 184, 0.35)",
                        },
                      }}
                    />
                    <span className="text-sm font-medium text-slate-700">
                      {rating ? rating.toFixed(1).replace(".0", "") : "No rating"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label
                className="text-sm font-medium text-slate-900"
                htmlFor={`review-comment-${rideId}-${revieweeId}`}
              >
                Comment
              </label>
              <textarea
                id={`review-comment-${rideId}-${revieweeId}`}
                value={comment}
                onChange={handleCommentChange}
                maxLength={1000}
                rows={5}
                placeholder="Was the pickup smooth? Was the passenger on time? Keep it useful."
                className="min-h-[140px] w-full resize-y rounded-[22px] border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.5)] outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
              />
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Optional, but specific feedback is more useful.</span>
                <span>{comment.length}/1000</span>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-h-5 text-sm">
                {createReview.isPending && (
                  <span className="text-slate-600">Submitting review...</span>
                )}
                {createReview.isError && (
                  <span className="text-red-600">
                    {createReview.error instanceof Error
                      ? createReview.error.message
                      : "Could not submit the review."}
                  </span>
                )}
              </div>

              <Button
                type="submit"
                disabled={createReview.isPending || rating === null}
                className="min-w-[180px] rounded-full bg-slate-950 px-6 text-white hover:bg-slate-800"
              >
                {createReview.isPending ? "Submitting..." : submitLabel}
              </Button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
