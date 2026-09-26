import type { ProfileUser } from "@/features/user/types";

const profileChecks = [
  {
    key: "avatar",
    label: "Add a profile photo",
    isComplete: (user: ProfileUser) => !!user.avatarPath,
  },
  {
    key: "phone",
    label: "Add a phone number",
    isComplete: (user: ProfileUser) => !!user.phone,
  },
  {
    key: "bio",
    label: "Write a short bio",
    isComplete: (user: ProfileUser) => !!user.bio,
  },
  {
    key: "home",
    label: "Set your home location",
    isComplete: (user: ProfileUser) => !!user.homeAddress,
  },
  {
    key: "campus",
    label: "Set your campus location",
    isComplete: (user: ProfileUser) => !!user.campusAddress,
  },
];

export function ProfileCompletionCard({ user }: { user: ProfileUser }) {
  const completedCount = profileChecks.filter((check) => check.isComplete(user)).length;
  const totalCount = profileChecks.length;
  const completionPercent = Math.round((completedCount / totalCount) * 100);
  const nextSteps = profileChecks.filter((check) => !check.isComplete(user));

  return (
    <section className="rounded-xl bg-card p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            Profile completion
          </p>
          <h2 className="mt-2 font-display text-display-sm text-foreground">
            {completionPercent}% complete
          </h2>
        </div>
        <div className="min-w-40">
          <div className="h-2 rounded-pill bg-soft">
            <div
              className="h-2 rounded-pill bg-primary transition-all"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {completedCount} of {totalCount} profile steps done
          </p>
        </div>
      </div>

      {nextSteps.length > 0 ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {nextSteps.map((step) => (
            <span
              key={step.key}
              className="rounded-pill border border-dashed border-border px-3 py-1 text-xs font-medium text-muted-foreground"
            >
              {step.label}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-5 text-sm text-success">
          Your profile is ready for rides.
        </p>
      )}
    </section>
  );
}
