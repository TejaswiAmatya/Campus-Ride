import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { Car, Star } from "lucide-react";
import { api } from "@/api/client";
import { AccountStatusBanner } from "@/features/user/components/AccountStatusBanner";
import { UserProfileCard } from "@/features/user/components/UserProfileCard";
import { VerificationBadge } from "@/features/user/components/VerificationBadge";
import {
  useDeleteMyAccount,
  useProfile,
  useSubmitAcademicVerification,
  useUpdateProfile,
} from "@/features/user/hooks/useProfile";

interface Review {
  id: string;
  rating: number;
  comment?: string;
  createdAt: string;
  reviewer: { name: string };
}

export function ProfilePage() {
  const { data: user } = useProfile();
  const updateProfileMutation = useUpdateProfile();
  const submitAcademicVerificationMutation = useSubmitAcademicVerification();
  const deleteMyAccountMutation = useDeleteMyAccount();
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioDraft, setBioDraft] = useState("");
  const [isEditingAddresses, setIsEditingAddresses] = useState(false);
  const [homeAddressDraft, setHomeAddressDraft] = useState("");
  const [campusAddressDraft, setCampusAddressDraft] = useState("");
  const [academicRoleDraft, setAcademicRoleDraft] = useState<
    "STUDENT" | "STAFF" | ""
  >((user?.academicRole ?? "") as "STUDENT" | "STAFF" | "");
  const [academicDocument, setAcademicDocument] = useState<File | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

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

  const showAcademicForm =
    user.academicVerificationStatus === "NOT_SUBMITTED" ||
    user.academicVerificationStatus === "REJECTED";
  const deleteAccountErrorMessage = axios.isAxiosError<{
    error?: { message?: string };
  }>(deleteMyAccountMutation.error)
    ? deleteMyAccountMutation.error.response?.data?.error?.message ??
      "Unable to close your account right now."
    : deleteMyAccountMutation.error instanceof Error
      ? deleteMyAccountMutation.error.message
      : null;

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

      <div className="rounded-lg border p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Bio</h2>
          {!isEditingBio ? (
            <button
              type="button"
              onClick={() => {
                setBioDraft(user.bio ?? "");
                setIsEditingBio(true);
              }}
              className="text-sm text-primary hover:underline"
            >
              Edit
            </button>
          ) : null}
        </div>

        {isEditingBio ? (
          <div className="space-y-3">
            <textarea
              value={bioDraft}
              onChange={(event) => setBioDraft(event.target.value)}
              rows={4}
              className="w-full rounded-md border px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={async () => {
                  await updateProfileMutation.mutateAsync({ bio: bioDraft });
                  setIsEditingBio(false);
                }}
                disabled={updateProfileMutation.isPending}
                className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setBioDraft(user.bio ?? "");
                  setIsEditingBio(false);
                }}
                disabled={updateProfileMutation.isPending}
                className="rounded-md border px-4 py-2 text-sm hover:bg-muted disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className={user.bio?.trim() ? "text-sm" : "text-sm text-muted-foreground"}>
            {user.bio?.trim() ? user.bio : "No bio yet"}
          </p>
        )}
      </div>

      <div className="rounded-lg border p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Addresses</h2>
          {!isEditingAddresses ? (
            <button
              type="button"
              onClick={() => {
                setHomeAddressDraft(user.homeAddress ?? "");
                setCampusAddressDraft(user.campusAddress ?? "");
                setIsEditingAddresses(true);
              }}
              className="text-sm text-primary hover:underline"
            >
              Edit
            </button>
          ) : null}
        </div>

        {isEditingAddresses ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Home address</label>
              <input
                type="text"
                value={homeAddressDraft}
                onChange={(event) => setHomeAddressDraft(event.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Campus address</label>
              <input
                type="text"
                value={campusAddressDraft}
                onChange={(event) => setCampusAddressDraft(event.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={async () => {
                  await updateProfileMutation.mutateAsync({
                    homeAddress: homeAddressDraft,
                    campusAddress: campusAddressDraft,
                  });
                  setIsEditingAddresses(false);
                }}
                disabled={updateProfileMutation.isPending}
                className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setHomeAddressDraft(user.homeAddress ?? "");
                  setCampusAddressDraft(user.campusAddress ?? "");
                  setIsEditingAddresses(false);
                }}
                disabled={updateProfileMutation.isPending}
                className="rounded-md border px-4 py-2 text-sm hover:bg-muted disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">Home address</p>
              <p
                className={
                  user.homeAddress?.trim()
                    ? "text-sm"
                    : "text-sm text-muted-foreground"
                }
              >
                {user.homeAddress?.trim()
                  ? user.homeAddress
                  : "No home address yet"}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium">Campus address</p>
              <p
                className={
                  user.campusAddress?.trim()
                    ? "text-sm"
                    : "text-sm text-muted-foreground"
                }
              >
                {user.campusAddress?.trim()
                  ? user.campusAddress
                  : "No campus address yet"}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-lg border p-6 space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Academic verification</h2>
          <p className="text-sm text-muted-foreground">
            Add a verified student or staff badge to your profile.
          </p>
        </div>

        {user.academicVerificationStatus === "PENDING" ? (
          <p className="rounded-md bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
            Your verification is under review
          </p>
        ) : null}

        {user.academicVerificationStatus === "VERIFIED" ? (
          <div className="rounded-md bg-emerald-50 px-3 py-3">
            <VerificationBadge
              academicRole={user.academicRole}
              academicVerificationStatus={user.academicVerificationStatus}
            />
          </div>
        ) : null}

        {user.academicVerificationStatus === "REJECTED" ? (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {user.academicRejectionReason ?? "Your verification was rejected."}
          </p>
        ) : null}

        {showAcademicForm ? (
          <form
            className="space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!academicRoleDraft || !academicDocument) return;

              await submitAcademicVerificationMutation.mutateAsync({
                role: academicRoleDraft,
                document: academicDocument,
              });

              setAcademicDocument(null);
            }}
          >
            <p className="text-sm font-medium text-slate-900">
              Get your verified badge
            </p>

            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <select
                value={academicRoleDraft}
                onChange={(event) =>
                  setAcademicRoleDraft(
                    event.target.value as "STUDENT" | "STAFF" | "",
                  )
                }
                className="w-full rounded-md border px-3 py-2 text-sm"
              >
                <option value="">Select role</option>
                <option value="STUDENT">Student</option>
                <option value="STAFF">Staff</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">ID document</label>
              <input
                type="file"
                onChange={(event) =>
                  setAcademicDocument(event.target.files?.[0] ?? null)
                }
                className="block w-full text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={
                submitAcademicVerificationMutation.isPending ||
                !academicRoleDraft ||
                !academicDocument
              }
              className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              Submit
            </button>
          </form>
        ) : null}
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

      <section className="rounded-lg border border-red-200 bg-white p-6 space-y-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-red-700">Danger zone</p>
          <h2 className="text-lg font-semibold">Delete my account</h2>
          <p className="text-sm text-muted-foreground">
            This permanently closes your account, removes access immediately,
            clears your profile and uploaded documents, and keeps historical
            ride records without keeping your public profile active.
          </p>
        </div>

        <div className="rounded-md border border-red-200 bg-white px-4 py-3">
          <p className="text-sm text-slate-900">
            Type <span className="font-semibold text-red-700">DELETE</span> to
            confirm this irreversible action.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Confirmation</label>
          <input
            type="text"
            value={deleteConfirmation}
            onChange={(event) =>
              setDeleteConfirmation(event.target.value.toUpperCase())
            }
            placeholder="DELETE"
            className="w-full rounded-md border border-red-200 bg-white px-3 py-2 text-sm uppercase tracking-[0.12em] placeholder:tracking-[0.12em] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-red-200"
          />
        </div>

        {deleteAccountErrorMessage ? (
          <p className="rounded-md bg-red-100 px-3 py-2 text-sm text-red-700">
            {deleteAccountErrorMessage}
          </p>
        ) : null}

        <div className="flex gap-2">
          <button
            type="button"
            disabled={
              deleteMyAccountMutation.isPending ||
              deleteConfirmation !== "DELETE"
            }
            onClick={() =>
              deleteMyAccountMutation.mutate({ confirmation: "DELETE" })
            }
            className="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
          >
            {deleteMyAccountMutation.isPending
              ? "Deleting account…"
              : "Delete my account"}
          </button>
        </div>
      </section>
    </div>
  );
}
