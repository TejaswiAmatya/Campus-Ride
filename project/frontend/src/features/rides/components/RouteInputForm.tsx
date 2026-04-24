import type { ChangeEvent } from 'react'
import { MapPin } from 'lucide-react'

interface RouteInputValue {
  address: string
  lat: string
  lng: string
}

interface RouteInputFormProps {
  origin: RouteInputValue
  destination: RouteInputValue
  onChange: (segment: 'origin' | 'destination', field: keyof RouteInputValue, value: string) => void
}

function LocationFieldset({
  legend,
  tone,
  value,
  onFieldChange,
}: {
  legend: string
  tone: string
  value: RouteInputValue
  onFieldChange: (field: keyof RouteInputValue, value: string) => void
}) {
  const setValue = (field: keyof RouteInputValue) => (event: ChangeEvent<HTMLInputElement>) => {
    onFieldChange(field, event.target.value)
  }

  return (
    <fieldset className="space-y-3 rounded-lg border p-4">
      <legend className="flex items-center gap-1 px-1 text-sm font-medium">
        <MapPin className={`h-4 w-4 ${tone}`} />
        {legend}
      </legend>
      <input
        placeholder={`${legend} address`}
        value={value.address}
        onChange={setValue('address')}
        required
        className="w-full rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <div className="grid grid-cols-2 gap-3">
        <input
          placeholder="Latitude"
          type="number"
          step="any"
          value={value.lat}
          onChange={setValue('lat')}
          required
          className="rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <input
          placeholder="Longitude"
          type="number"
          step="any"
          value={value.lng}
          onChange={setValue('lng')}
          required
          className="rounded-md border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
    </fieldset>
  )
}

export function RouteInputForm({ origin, destination, onChange }: RouteInputFormProps) {
  return (
    <div className="space-y-4">
      <LocationFieldset
        legend="Origin"
        tone="text-green-600"
        value={origin}
        onFieldChange={(field, value) => onChange('origin', field, value)}
      />
      <LocationFieldset
        legend="Destination"
        tone="text-red-500"
        value={destination}
        onFieldChange={(field, value) => onChange('destination', field, value)}
      />
    </div>
  )
}
