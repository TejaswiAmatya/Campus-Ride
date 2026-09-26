import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    <div className="rounded-xl bg-soft p-5">
      <div className="space-y-4">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">
            Edit details
          </p>
          <h3 className="font-display text-display-sm text-foreground">
            Refine how your profile appears
          </h3>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="profile-name" className="text-sm font-medium">
              Name
            </label>
            <Input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={1}
              className="bg-softer"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="profile-phone" className="text-sm font-medium">
              Phone number
            </label>
            <Input
              id="profile-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+47 900 00 000"
              className="bg-softer"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="profile-email" className="text-sm font-medium">
            University email
          </label>
          <Input
            id="profile-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-softer"
          />
          <p className="text-xs text-muted-foreground">
            Email is validated here, but profile save currently persists name and
            phone only.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={updateProfile.isPending}
          >
            {updateProfile.isPending ? "Saving..." : "Save changes"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={updateProfile.isPending}
          >
            Cancel
          </Button>
        </div>
      </div>

      {validationError ? (
        <p className="mt-4 text-sm text-destructive">{validationError}</p>
      ) : null}

      {updateProfile.isError ? (
        <p className="mt-2 text-sm text-destructive">
          Failed to update your details. Please try again.
        </p>
      ) : null}
    </div>
  );
}
