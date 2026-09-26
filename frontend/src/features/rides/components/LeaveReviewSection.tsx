import { useMemo, useState, type ReactNode } from "react";
import Rating from "@mui/material/Rating";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useCreateRideReview } from "@/features/user/hooks/useProfile";

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
    <section className="relative overflow-hidden rounded-xl bg-background p-6">
      <div
        aria-hidden="true"
        className="hidden"
      />

      <div className="relative space-y-6">
        <div className="space-y-2">
          <div className="inline-flex items-center rounded-pill bg-soft px-3 py-1 text-xs font-medium text-mute">
            Ride feedback
          </div>
          <div className="space-y-1">
            <h3 className="font-display text-display-md text-foreground">
              {title}
            </h3>
            <p className="max-w-xl text-sm leading-6 text-muted-foreground">
              {description}
              {revieweeName && (
                <>
                  {" "}
                  Reviewing{" "}
                  {revieweeProfileHref ? (
                    <Link
                      to={revieweeProfileHref}
                      className="font-medium text-foreground underline underline-offset-4 transition hover:text-hairline-mid"
                    >
                      {revieweeName}
                    </Link>
                  ) : (
                    <span className="font-medium text-foreground">
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
          <div className="rounded-xl bg-soft p-5 text-sm text-foreground">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-medium">
                You already reviewed this user for this ride.
              </p>
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-success">
                  Submitted
                </span>
                <Rating
                  name="half-rating-read"
                  defaultValue={2.5}
                  precision={0.5}
                  value={rating}
                  readOnly
                  sx={{
                    color: "#000000",
                    "& .MuiRating-iconEmpty": {
                      color: "rgba(175, 175, 175, 0.45)",
                    },
                  }}
                />
              </div>
            </div>
          </div>
        ) : (
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="rounded-xl bg-soft p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Your rating</p>
                  <Rating
                    name="half-rating"
                    defaultValue={2.5}
                    precision={0.5}
                    value={rating}
                    onChange={handleRatingChange}
                    sx={{
                      fontSize: "2rem",
                      color: "#000000",
                      "& .MuiRating-iconEmpty": {
                        color: "rgba(175, 175, 175, 0.45)",
                      },
                    }}
                  />
                  <p className="text-xs text-muted-foreground">{helperText}</p>
                </div>

                <div className="rounded-xl bg-background px-4 py-3">
                  <p className="text-xs font-medium text-mute">
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
                        color: "#000000",
                        "& .MuiRating-iconEmpty": {
                          color: "rgba(175, 175, 175, 0.45)",
                        },
                      }}
                    />
                    <span className="text-sm font-medium text-foreground">
                      {rating ? rating.toFixed(1).replace(".0", "") : "No rating"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label
                className="text-sm font-medium text-foreground"
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
                className="min-h-[140px] w-full resize-y rounded-xl border-0 bg-soft px-4 py-3 text-sm leading-6 text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Optional, but specific feedback is more useful.</span>
                <span>{comment.length}/1000</span>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-h-5 text-sm">
                {createReview.isPending && (
                  <span className="text-muted-foreground">Submitting review...</span>
                )}
                {createReview.isError && (
                  <span className="text-destructive">
                    {createReview.error instanceof Error
                      ? createReview.error.message
                      : "Could not submit the review."}
                  </span>
                )}
              </div>

              <Button
                type="submit"
                disabled={createReview.isPending || rating === null}
                className="min-w-[180px]"
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
