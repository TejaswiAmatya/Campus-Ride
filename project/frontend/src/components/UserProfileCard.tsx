import { useState } from "react";

import { AvatarUpload } from "@/components/AvatarUpload";
import { EditUserDetailForm } from "@/components/EditUserDetailForm";
import { VerificationBadge } from "@/components/VerificationBadge";
import type { ProfileUser as UserProfile } from "@/hooks/useProfile";

interface UserProfileCardProps {
  user: UserProfile;
  onAvatarSaved: (url: string) => void;
  onDetailsSaved: () => void;
}

export function UserProfileCard({
  user,
  onAvatarSaved,
  onDetailsSaved,
}: UserProfileCardProps) {
  const [isEditingDetails, setIsEditingDetails] = useState(false);

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-border/70 bg-gradient-to-br from-white via-white to-secondary/20 p-6 shadow-[0_18px_55px_-30px_rgba(15,23,42,0.45)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(148,163,184,0.16),transparent_38%),linear-gradient(135deg,transparent_0%,rgba(226,232,240,0.55)_100%)]" />
      <div className="relative flex flex-col gap-5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <AvatarUpload onSaved={onAvatarSaved} />

        <div className="min-w-0 flex-1 rounded-2xl border border-white/70 bg-white/80 p-4 backdrop-blur-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-lg font-semibold">{user.name}</p>
                <button
                  type="button"
                  onClick={() => setIsEditingDetails(true)}
                  className="text-xs text-primary hover:underline"
                >
                  Edit
                </button>
              </div>

              <VerificationBadge
                academicRole={user.academicRole}
                academicVerificationStatus={user.academicVerificationStatus}
              />
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>

            <span className="inline-flex rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              {user.role}
            </span>
          </div>
        </div>
      </div>

        {isEditingDetails ? (
          <EditUserDetailForm
            initialName={user.name}
            initialPhone={user.phone}
            initialEmail={user.email}
            onSaved={() => {
              setIsEditingDetails(false);
              onDetailsSaved();
            }}
            onCancel={() => setIsEditingDetails(false)}
          />
        ) : null}
      </div>
    </div>
  );
}
