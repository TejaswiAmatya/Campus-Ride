import { useEffect, useRef, useState } from 'react'
import { GripVertical, LoaderCircle, MapPin, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { GeocodingSuggestion } from '../lib/geocoding'
import { searchPlaces } from '../lib/geocoding'

export type StopFormValue = {
  address: string
  lat: number | null
  lng: number | null
}

export function StopsEditor({
  stops,
  onChange,
}: {
  stops: StopFormValue[]
  onChange: (stops: StopFormValue[]) => void
}) {
  const setStopAddress = (index: number, address: string) => {
    const next = [...stops]
    next[index] = { address, lat: null, lng: null }
    onChange(next)
  }

  const selectSuggestion = (index: number, suggestion: GeocodingSuggestion) => {
    const next = [...stops]
    next[index] = {
      address: suggestion.address,
      lat: suggestion.lat,
      lng: suggestion.lng,
    }
    onChange(next)
  }

  const removeStop = (index: number) => {
    const next = stops.filter((_, current) => current !== index)
    onChange(next)
  }

  const addEmptyStop = () => {
    onChange([...stops, { address: '', lat: null, lng: null }])
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Waypoint stops</p>
          <p className="text-xs text-muted-foreground">Optional pickup, drop-by, or shared-route stops before the final destination.</p>
        </div>
        <Button size="sm" variant="outline" onClick={addEmptyStop}>
          <Plus className="mr-2 h-4 w-4" />
          Add stop
        </Button>
      </div>

      {stops.length === 0 ? (
        <p className="rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">
          No extra stops added.
        </p>
      ) : (
        <div className="space-y-3">
          {stops.map((stop, index) => (
            <StopRow
              key={index}
              index={index}
              value={stop}
              onAddressChange={(address) => setStopAddress(index, address)}
              onSelectSuggestion={(suggestion) => selectSuggestion(index, suggestion)}
              onRemove={() => removeStop(index)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function StopRow({
  index,
  value,
  onAddressChange,
  onSelectSuggestion,
  onRemove,
}: {
  index: number
  value: StopFormValue
  onAddressChange: (address: string) => void
  onSelectSuggestion: (suggestion: GeocodingSuggestion) => void
  onRemove: () => void
}) {
  const [suggestions, setSuggestions] = useState<GeocodingSuggestion[]>([])
  const [isFocused, setIsFocused] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsFocused(false)
      }
    }

    window.addEventListener('mousedown', handlePointerDown)
    return () => window.removeEventListener('mousedown', handlePointerDown)
  }, [])

  useEffect(() => {
    if (!value.address.trim()) {
      setSuggestions([])
      setIsLoading(false)
      return
    }

    const controller = new AbortController()
    const timeoutId = window.setTimeout(async () => {
      try {
        setIsLoading(true)
        const results = await searchPlaces(value.address, controller.signal)
        setSuggestions(results)
      } catch {
        setSuggestions([])
      } finally {
        setIsLoading(false)
      }
    }, 250)

    return () => {
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [value.address])

  return (
    <div ref={rootRef} className="rounded-lg border bg-muted/20 p-3">
      <div className="flex items-center gap-2">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Stop {index + 1}
        </span>
      </div>

      <div className="relative mt-3">
        <input
          value={value.address}
          onChange={(event) => {
            onAddressChange(event.target.value)
            setIsFocused(true)
          }}
          onFocus={() => setIsFocused(true)}
          placeholder="Search stop address"
          className="w-full rounded-md border border-input px-3 py-2 pr-10 text-sm"
        />
        {isLoading && (
          <LoaderCircle className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
        {isFocused && suggestions.length > 0 && (
          <div className="absolute z-20 mt-2 w-full rounded-md border bg-background shadow-lg">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                type="button"
                className="block w-full border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-secondary"
                onClick={() => {
                  onSelectSuggestion(suggestion)
                  setIsFocused(false)
                }}
              >
                <span className="block font-medium">{suggestion.label}</span>
                <span className="block text-xs text-muted-foreground">{suggestion.address}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="h-4 w-4" />
          {value.lat !== null && value.lng !== null ? `${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}` : 'Select a resolved stop from search'}
        </div>
        <Button size="sm" variant="ghost" onClick={onRemove}>
          <Trash2 className="mr-2 h-4 w-4" />
          Remove
        </Button>
      </div>
    </div>
  )
}
