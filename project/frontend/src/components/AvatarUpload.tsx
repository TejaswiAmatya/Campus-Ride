import { useId, useState } from "react";
import { Loader2, Upload, User } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { useUpdateProfile } from "@/hooks/useProfile";
import { supabase } from "@/lib/supabase";

const AVATAR_BUCKET = "avatars";
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

function getAvatarPath(userId: string, file: File): string {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  return `${userId}/avatar-${Date.now()}.${ext}`;
}

export function AvatarUpload() {
  const inputId = useId();
  const { user } = useAuth();
  const updateProfile = useUpdateProfile();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const avatarUrl = user?.avatarPath;
  const isBusy = isUploading || updateProfile.isPending;

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !user) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError("Please choose an image smaller than 5 MB.");
      return;
    }

    setError(null);
    setIsUploading(true);

    const objectPath = getAvatarPath(user.id, file);

    try {
      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(objectPath, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from(AVATAR_BUCKET)
        .getPublicUrl(objectPath);
      await updateProfile.mutateAsync({ avatarPath: data.publicUrl });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to upload avatar.";
      setError(message);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={user?.name ?? "Avatar preview"}
            className="h-20 w-20 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <User className="h-10 w-10 text-primary" />
          </div>
        )}

        <div className="space-y-2">
          <label
            htmlFor={inputId}
            className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {isBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {isBusy ? "Uploading..." : "Upload avatar"}
          </label>
          <input
            id={inputId}
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={isBusy || !user}
            onChange={handleFileChange}
          />
          <p className="text-xs text-muted-foreground">
            PNG, JPG, or WebP up to 5 MB.
          </p>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
