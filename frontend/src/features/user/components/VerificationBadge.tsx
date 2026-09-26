import { Badge } from "@/components/ui/badge";

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
    <Badge variant="success">
      ✓ Verified {academicRole === "STUDENT" ? "Student" : "Staff"}
    </Badge>
  );
}
