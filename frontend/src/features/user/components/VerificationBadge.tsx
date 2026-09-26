interface VerificationBadgeProps {
  academicRole: "STUDENT" | "STAFF" | null;
  academicVerificationStatus:
    | "NOT_SUBMITTED"
    | "PENDING"
    | "VERIFIED"
    | "REJECTED";
}

export function VerificationBadge({
  academicRole,
  academicVerificationStatus,
}: VerificationBadgeProps) {
  if (academicVerificationStatus !== "VERIFIED" || academicRole === null) {
    return null;
  }

  return (
    <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-800">
      ✓ Verified {academicRole === "STUDENT" ? "Student" : "Staff"}
    </span>
  );
}
