import type { ReactNode } from "react";

export function AuthPageLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[calc(100dvh-3.5rem-3rem-1px)] items-center bg-background">
      <div className="ml-[calc(50%-37.5vw)] grid w-[75vw] shrink-0 items-center gap-8 py-4 md:grid-cols-2 md:gap-12">
        <div className="w-full min-w-0 rounded-xl bg-soft px-8 py-10 shadow-elev-2">
          {children}
        </div>
        <div className="w-full min-w-0">
          <img
            src="/login.png"
            alt="Two people meeting a car at a campus pickup pin"
            className="h-auto w-full rounded-xl"
          />
        </div>
      </div>
    </div>
  );
}
