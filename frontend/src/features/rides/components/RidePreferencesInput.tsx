import { cn } from '@/lib/utils'

const preferenceOptions = [
  'Quiet ride',
  'No smoking',
  'Pets allowed',
  'Music okay',
  'Luggage friendly',
  'Women only',
]

export function RidePreferencesInput({
  value,
  onChange,
}: {
  value: string[]
  onChange: (value: string[]) => void
}) {
  const toggle = (preference: string) => {
    onChange(
      value.includes(preference)
        ? value.filter((item) => item !== preference)
        : [...value, preference],
    )
  }

  return (
    <div className="space-y-3 rounded-xl bg-soft p-4">
      <div>
        <p className="text-sm font-medium">Ride preferences</p>
        <p className="text-xs text-muted-foreground">Help passengers know the vibe and expectations before they book.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {preferenceOptions.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => toggle(option)}
            className={cn(
              'rounded-pill px-3 py-1.5 text-sm font-medium transition',
              value.includes(option)
                ? 'bg-primary text-primary-foreground'
                : 'bg-background text-foreground hover:bg-border',
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}
