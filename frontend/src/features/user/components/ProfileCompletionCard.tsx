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
    <section className="rounded-3xl border bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Profile completion
          </p>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">
            {completionPercent}% complete
          </h2>
        </div>
        <div className="min-w-40">
          <div className="h-2 rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-slate-900 transition-all"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-slate-600">
            {completedCount} of {totalCount} profile steps done
          </p>
        </div>
      </div>

      {nextSteps.length > 0 ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {nextSteps.map((step) => (
            <span
              key={step.key}
              className="rounded-full border border-dashed border-slate-300 px-3 py-1 text-xs font-medium text-slate-600"
            >
              {step.label}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-5 text-sm text-emerald-700">
          Your profile is ready for rides.
        </p>
      )}
    </section>
  );
}
