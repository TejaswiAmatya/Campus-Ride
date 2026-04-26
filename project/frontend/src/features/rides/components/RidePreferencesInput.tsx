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
    <div className="space-y-3 rounded-lg border p-4">
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
              'rounded-full border px-3 py-1.5 text-sm transition',
              value.includes(option)
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'hover:bg-muted',
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}
