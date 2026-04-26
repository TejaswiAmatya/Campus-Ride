import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Car, Star } from "lucide-react";
import { api } from "@/api/client";
import { AccountStatusBanner } from "@/components/AccountStatusBanner";
import { UserProfileCard } from "@/components/UserProfileCard";
import { useProfile } from "@/hooks/useProfile";

interface Review {
  id: string;
  rating: number;
  comment?: string;
  createdAt: string;
  reviewer: { name: string };
}

export function ProfilePage() {
  const { data: user } = useProfile();

  const { data: reviews } = useQuery({
    queryKey: ["reviews", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await api.get<{ data: Review[] }>(
        `/api/users/${user.id}/reviews`,
      );
      return res.data.data ?? [];
    },
    enabled: !!user?.id && user.role === "DRIVER",
  });

  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <h1 className="text-2xl font-bold">Your Profile</h1>
      <AccountStatusBanner
        accountStatus={user.accountStatus}
        suspendedUntil={user.suspendedUntil}
      />

      {/* Profile card */}
      <UserProfileCard
        user={user}
        onAvatarSaved={() => undefined}
        onDetailsSaved={() => undefined}
      />

      {/* Driver status */}
      {user.role === "DRIVER" && (
        <div className="rounded-lg border p-6 space-y-3">
          <div className="flex items-center gap-2 font-medium">
            <Car className="h-5 w-5 text-primary" />
            Driver status
          </div>
          {user.isDriverApproved ? (
            <p className="text-sm text-green-700 bg-green-50 rounded-md px-3 py-2">
              ✓ Approved — you can post rides.
            </p>
          ) : (
            <p className="text-sm text-yellow-700 bg-yellow-50 rounded-md px-3 py-2">
              Your driver application is pending admin review.
            </p>
          )}
        </div>
      )}

      {/* Become a driver CTA */}
      {user.role === "PASSENGER" && (
        <div className="rounded-lg border border-dashed p-6 text-center space-y-3">
          <Car className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="font-medium">Want to drive?</p>
          <p className="text-sm text-muted-foreground">
            Apply to become a driver and start earning on your commute.
          </p>
          <Link
            to="/driver/register"
            className="inline-block rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
          >
            Apply as driver
          </Link>
        </div>
      )}

      {/* Reviews (for drivers) */}
      {user.role === "DRIVER" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Passenger reviews
          </h2>
          {(reviews ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No reviews yet.</p>
          ) : (
            (reviews ?? []).map((review: Review) => (
              <div key={review.id} className="rounded-lg border p-4 space-y-1">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${i < review.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-200"}`}
                    />
                  ))}
                </div>
                {review.comment && <p className="text-sm">{review.comment}</p>}
                <p className="text-xs text-muted-foreground">
                  {new Date(review.createdAt).toLocaleDateString("en-GB")}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
