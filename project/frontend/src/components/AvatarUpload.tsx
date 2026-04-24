import { useEffect, useId, useState } from "react";
import { Loader2, Upload, User } from "lucide-react";

import { api } from "@/api/client";
import { useAuth } from "@/hooks/useAuth";
import { useUpdateProfile } from "@/hooks/useProfile";
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

interface AvatarUploadProps {
  onSaved?: (url: string) => void;
}

export function AvatarUpload({ onSaved }: AvatarUploadProps) {
  const inputId = useId();
  const { user } = useAuth();
  const updateProfile = useUpdateProfile();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const avatarUrl = previewUrl ?? user?.avatarPath;
  const isBusy = isUploading || updateProfile.isPending;
  const hasPendingAvatar = !!selectedFile;

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedFile]);

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
    setSelectedFile(file);
  }

  function handleCancel() {
    if (isBusy) {
      return;
    }

    setError(null);
    setSelectedFile(null);
  }

  async function handleUpload() {
    if (!selectedFile || !user) {
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("avatar", selectedFile);
      const res = await api.post<{ data: { avatarPath?: string } }>(
        "/api/users/me/avatar",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );

      const avatarPath = res.data.data.avatarPath;
      if (!avatarPath) {
        throw new Error("Avatar upload succeeded but no URL was returned.");
      }

      await updateProfile.mutateAsync({ avatarPath });
      onSaved?.(avatarPath);
      setSelectedFile(null);
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
            className={`inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors ${
              isBusy || !user
                ? "cursor-not-allowed opacity-50"
                : "cursor-pointer hover:bg-primary/90"
            }`}
          >
            <Upload className="h-4 w-4" />
            Choose avatar
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
          {hasPendingAvatar ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleUpload}
                disabled={isBusy || !user}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {isBusy ? "Saving..." : "Save avatar"}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={isBusy}
                className="rounded-md border border-input px-4 py-2 text-sm text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          ) : null}
          {hasPendingAvatar ? (
            <p className="text-xs text-muted-foreground">
              Preview ready. Save to update your profile photo.
            </p>
          ) : null}
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
