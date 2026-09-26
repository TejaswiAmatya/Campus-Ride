import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { Car, Star } from "lucide-react";
import { api } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      <h1 className="font-display text-display-md text-foreground">Your Profile</h1>
      <AccountStatusBanner
        accountStatus={user.accountStatus}
        suspendedUntil={user.suspendedUntil}
      />

      <UserProfileCard
        user={user}
        onAvatarSaved={() => undefined}
        onDetailsSaved={() => undefined}
      />

      <Card className="rounded-xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-display-sm">Bio</CardTitle>
          {!isEditingBio ? (
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={() => {
                setBioDraft(user.bio ?? "");
                setIsEditingBio(true);
              }}
              className="h-auto p-0"
            >
              Edit
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          {isEditingBio ? (
            <div className="space-y-3">
              <textarea
                value={bioDraft}
                onChange={(event) => setBioDraft(event.target.value)}
                rows={4}
                className="w-full rounded-md border-0 bg-soft px-4 py-3 text-sm text-foreground placeholder:text-mute focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={async () => {
                    await updateProfileMutation.mutateAsync({ bio: bioDraft });
                    setIsEditingBio(false);
                  }}
                  disabled={updateProfileMutation.isPending}
                >
                  Save
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setBioDraft(user.bio ?? "");
                    setIsEditingBio(false);
                  }}
                  disabled={updateProfileMutation.isPending}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className={user.bio?.trim() ? "text-sm" : "text-sm text-muted-foreground"}>
              {user.bio?.trim() ? user.bio : "No bio yet"}
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-display-sm">Addresses</CardTitle>
          {!isEditingAddresses ? (
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={() => {
                setHomeAddressDraft(user.homeAddress ?? "");
                setCampusAddressDraft(user.campusAddress ?? "");
                setIsEditingAddresses(true);
              }}
              className="h-auto p-0"
            >
              Edit
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          {isEditingAddresses ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Home address</label>
                <Input
                  type="text"
                  value={homeAddressDraft}
                  onChange={(event) => setHomeAddressDraft(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Campus address</label>
                <Input
                  type="text"
                  value={campusAddressDraft}
                  onChange={(event) => setCampusAddressDraft(event.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={async () => {
                    await updateProfileMutation.mutateAsync({
                      homeAddress: homeAddressDraft,
                      campusAddress: campusAddressDraft,
                    });
                    setIsEditingAddresses(false);
                  }}
                  disabled={updateProfileMutation.isPending}
                >
                  Save
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setHomeAddressDraft(user.homeAddress ?? "");
                    setCampusAddressDraft(user.campusAddress ?? "");
                    setIsEditingAddresses(false);
                  }}
                  disabled={updateProfileMutation.isPending}
                >
                  Cancel
                </Button>
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
        </CardContent>
      </Card>

      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="text-display-sm">Academic verification</CardTitle>
          <p className="text-sm text-muted-foreground">
            Add a verified student or staff badge to your profile.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {user.academicVerificationStatus === "PENDING" ? (
            <p className="rounded-xl bg-warning/10 px-3 py-2 text-sm text-foreground">
              Your verification is under review
            </p>
          ) : null}

          {user.academicVerificationStatus === "VERIFIED" ? (
            <div className="rounded-xl bg-success/10 px-3 py-3">
              <VerificationBadge
                academicRole={user.academicRole}
                academicVerificationStatus={user.academicVerificationStatus}
              />
            </div>
          ) : null}

          {user.academicVerificationStatus === "REJECTED" ? (
            <p className="rounded-xl bg-warning/10 px-3 py-2 text-sm text-foreground">
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
              <p className="text-sm font-medium text-foreground">
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
                  className="flex h-12 w-full rounded-md border-0 bg-soft px-4 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                  className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-pill file:border-0 file:bg-soft file:px-4 file:py-2 file:text-sm file:font-medium file:text-foreground"
                />
              </div>

              <Button
                type="submit"
                disabled={
                  submitAcademicVerificationMutation.isPending ||
                  !academicRoleDraft ||
                  !academicDocument
                }
              >
                Submit
              </Button>
            </form>
          ) : null}
        </CardContent>
      </Card>

      {user.role === "DRIVER" && (
        <Card className="rounded-xl">
          <CardContent className="space-y-3 p-6">
            <div className="flex items-center gap-2 font-medium">
              <Car className="h-5 w-5 text-foreground" />
              Driver status
            </div>
            {user.isDriverApproved ? (
              <p className="rounded-xl bg-success/10 px-3 py-2 text-sm text-success">
                ✓ Approved — you can post rides.
              </p>
            ) : (
              <p className="rounded-xl bg-warning/10 px-3 py-2 text-sm text-foreground">
                Your driver application is pending admin review.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {user.role === "PASSENGER" && (
        <Card className="rounded-xl border border-dashed border-border">
          <CardContent className="space-y-3 p-6 text-center">
            <Car className="mx-auto h-10 w-10 text-mute" />
            <p className="font-medium">Want to drive?</p>
            <p className="text-sm text-muted-foreground">
              Apply to become a driver and start earning on your commute.
            </p>
            <Button asChild>
              <Link to="/driver/register">Apply as driver</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {user.role === "DRIVER" && (
        <div className="space-y-4">
          <h2 className="flex items-center gap-2 font-display text-display-sm text-foreground">
            <Star className="h-5 w-5 text-foreground" />
            Passenger reviews
          </h2>
          {(reviews ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No reviews yet.</p>
          ) : (
            (reviews ?? []).map((review: Review) => (
              <Card key={review.id} className="rounded-xl">
                <CardContent className="space-y-1 p-4">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${i < review.rating ? "fill-foreground text-foreground" : "text-mute"}`}
                      />
                    ))}
                  </div>
                  {review.comment && <p className="text-sm">{review.comment}</p>}
                  <p className="text-xs text-muted-foreground">
                    {new Date(review.createdAt).toLocaleDateString("en-GB")}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      <Card className="rounded-xl border border-destructive/30">
        <CardContent className="space-y-4 p-6">
          <div className="space-y-1">
            <p className="text-sm font-medium text-destructive">Danger zone</p>
            <h2 className="font-display text-display-sm text-foreground">
              Delete my account
            </h2>
            <p className="text-sm text-muted-foreground">
              This permanently closes your account, removes access immediately,
              clears your profile and uploaded documents, and keeps historical
              ride records without keeping your public profile active.
            </p>
          </div>

          <div className="rounded-xl bg-soft px-4 py-3">
            <p className="text-sm text-foreground">
              Type <span className="font-semibold text-destructive">DELETE</span> to
              confirm this irreversible action.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Confirmation</label>
            <Input
              type="text"
              value={deleteConfirmation}
              onChange={(event) =>
                setDeleteConfirmation(event.target.value.toUpperCase())
              }
              placeholder="DELETE"
              className="uppercase tracking-[0.12em] placeholder:tracking-[0.12em]"
            />
          </div>

          {deleteAccountErrorMessage ? (
            <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {deleteAccountErrorMessage}
            </p>
          ) : null}

          <Button
            type="button"
            variant="destructive"
            disabled={
              deleteMyAccountMutation.isPending ||
              deleteConfirmation !== "DELETE"
            }
            onClick={() =>
              deleteMyAccountMutation.mutate({ confirmation: "DELETE" })
            }
          >
            {deleteMyAccountMutation.isPending
              ? "Deleting account…"
              : "Delete my account"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
