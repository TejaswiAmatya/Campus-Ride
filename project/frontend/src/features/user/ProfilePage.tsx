import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Car, Star } from "lucide-react";
import { api } from "@/api/client";
import { AvatarUpload } from "@/components/AvatarUpload";
import { useAuth } from "@/hooks/useAuth";
import { useUpdateProfile } from "@/hooks/useProfile";

interface Review {
  id: string;
  rating: number;
  comment?: string;
  createdAt: string;
  reviewer: { name: string };
}

export function ProfilePage() {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name ?? "");

  const updateMutation = useUpdateProfile();

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

      {/* Profile card */}
      <div className="rounded-lg border p-6 space-y-4">
        <div className="flex items-center gap-4">
          <AvatarUpload />
          <div>
            {editing ? (
              <div className="flex gap-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-md border border-input px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  onClick={() =>
                    updateMutation.mutate(
                      { name },
                      { onSuccess: () => setEditing(false) },
                    )
                  }
                  disabled={updateMutation.isPending}
                  className="rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="text-xs text-muted-foreground hover:underline"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="font-semibold text-lg">{user.name}</p>
                <button
                  onClick={() => {
                    setName(user.name);
                    setEditing(true);
                  }}
                  className="text-xs text-primary hover:underline"
                >
                  Edit
                </button>
              </div>
            )}
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <span className="inline-block rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium mt-1">
              {user.role}
            </span>
          </div>
        </div>
      </div>

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
