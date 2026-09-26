import { useEffect, useState } from "react";

import { useUpdateProfile } from "@/features/user/hooks/useProfile";

const UNIVERSITY_EMAIL_RE = /@[a-zA-Z0-9.-]+\.(edu|no)$/i;

interface EditUserDetailFormProps {
  initialName: string;
  initialPhone?: string;
  initialEmail: string;
  onSaved: () => void;
  onCancel: () => void;
}

export function EditUserDetailForm({
  initialName,
  initialPhone,
  initialEmail,
  onSaved,
  onCancel,
}: EditUserDetailFormProps) {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [email, setEmail] = useState(initialEmail);
  const [validationError, setValidationError] = useState<string | null>(null);
  const updateProfile = useUpdateProfile();

  useEffect(() => {
    setName(initialName);
    setPhone(initialPhone ?? "");
    setEmail(initialEmail);
    setValidationError(null);
  }, [initialEmail, initialName, initialPhone]);

  function handleSubmit() {
    const normalizedName = name.trim();
    const normalizedEmail = email.trim();
    const normalizedPhone = phone.trim();

    if (normalizedName.length < 1) {
      setValidationError("Name is required.");
      return;
    }

    if (!normalizedEmail) {
      setValidationError("Email is required.");
      return;
    }

    if (!UNIVERSITY_EMAIL_RE.test(normalizedEmail)) {
      setValidationError("Use a valid university email ending in .edu or .no.");
      return;
    }

    setValidationError(null);

    updateProfile.mutate(
      {
        name: normalizedName,
        phone: normalizedPhone || undefined,
      },
      { onSuccess: () => onSaved() },
    );
  }

  return (
    <div className="relative overflow-hidden rounded-[24px] border border-border/70 bg-white/95 p-5 shadow-[0_24px_70px_-38px_rgba(15,23,42,0.5)] backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(226,232,240,0.55),transparent_45%),radial-gradient(circle_at_top_right,rgba(148,163,184,0.14),transparent_35%)]" />

      <div className="relative space-y-4">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Edit Details
          </p>
          <h3 className="text-base font-semibold text-foreground">
            Refine how your profile appears
          </h3>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="profile-name" className="text-sm font-medium">
              Name
            </label>
            <input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={1}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="profile-phone" className="text-sm font-medium">
              Phone number
            </label>
            <input
              id="profile-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+47 900 00 000"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="profile-email" className="text-sm font-medium">
            University email
          </label>
          <input
            id="profile-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="text-xs text-muted-foreground">
            Email is validated here, but profile save currently persists name and
            phone only.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={updateProfile.isPending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {updateProfile.isPending ? "Saving..." : "Save changes"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={updateProfile.isPending}
            className="rounded-md border border-input px-4 py-2 text-sm text-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>

      {validationError ? (
        <p className="relative mt-4 text-sm text-destructive">
          {validationError}
        </p>
      ) : null}

      {updateProfile.isError ? (
        <p className="text-sm text-destructive">
          Failed to update your details. Please try again.
        </p>
      ) : null}
    </div>
  );
}
