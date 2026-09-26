interface SeatSelectorProps {
  value: string
  onChange: (value: string) => void
}

export function SeatSelector({ value, onChange }: SeatSelectorProps) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">Available seats</label>
      <input
        type="number"
        min="1"
        max="8"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
        className="w-full rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  )
}
