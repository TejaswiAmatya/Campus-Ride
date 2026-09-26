import { Input } from '@/components/ui/input'

interface SeatSelectorProps {
  value: string
  onChange: (value: string) => void
}

export function SeatSelector({ value, onChange }: SeatSelectorProps) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">Available seats</label>
      <Input
        type="number"
        min="1"
        max="8"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
      />
    </div>
  )
}
