import { useState } from 'react'

import { Button } from '@/components/ui/button'

export function PendingDriverBanner() {
  const [isDismissed, setIsDismissed] = useState(false)

  if (isDismissed) return null

  return (
    <div role="status" className="w-full border-b border-warning/30 bg-warning/10 px-4 py-3 text-foreground">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
        <span className="text-sm">
          Your driver application is under review. You can still use the app as a passenger in the meantime.
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="Dismiss banner"
          onClick={() => setIsDismissed(true)}
          className="h-8 w-8 px-0 text-lg leading-none"
        >
          ×
        </Button>
      </div>
    </div>
  )
}
