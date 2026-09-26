import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AvatarUpload } from "@/features/user/components/AvatarUpload";
import { EditUserDetailForm } from "@/features/user/components/EditUserDetailForm";
import { VerificationBadge } from "@/features/user/components/VerificationBadge";
import type { ProfileUser as UserProfile } from "@/features/user/types";

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
    <div className="rounded-xl bg-card p-6">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <AvatarUpload onSaved={onAvatarSaved} />

          <div className="min-w-0 flex-1 rounded-xl bg-soft p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-display text-display-sm text-foreground">
                    {user.name}
                  </p>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={() => setIsEditingDetails(true)}
                    className="h-auto p-0 text-xs"
                  >
                    Edit
                  </Button>
                </div>

                <VerificationBadge
                  academicRole={user.academicRole}
                  academicVerificationStatus={user.academicVerificationStatus}
                />
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>

              <Badge variant="secondary">{user.role}</Badge>
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
