import { useState } from 'react'

export function PendingDriverBanner() {
  const [isDismissed, setIsDismissed] = useState(false)

  if (isDismissed) return null

  return (
    <div role="status" className="w-full border-b border-amber-300 bg-amber-50 px-4 py-3 text-amber-900">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
        <span>
          Your driver application is under review. You can still use the app as a passenger in the meantime.
        </span>
        <button
          type="button"
          aria-label="Dismiss banner"
          onClick={() => setIsDismissed(true)}
          className="rounded px-2 text-xl leading-none text-amber-900 transition-colors hover:bg-amber-200"
        >
          ×
        </button>
      </div>
    </div>
  )
}
