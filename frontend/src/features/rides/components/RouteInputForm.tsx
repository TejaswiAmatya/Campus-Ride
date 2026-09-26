import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { LoaderCircle, MapPin, MapPinned } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { GeocodingSuggestion } from '../lib/geocoding'
import { searchPlaces } from '../lib/geocoding'

export interface RouteInputValue {
  address: string
  lat: number | null
  lng: number | null
}

interface RouteInputFormProps {
  origin: RouteInputValue
  destination: RouteInputValue
  mapSelectionTarget: 'origin' | 'destination' | null
  onAddressInput: (segment: 'origin' | 'destination', value: string) => void
  onSelectSuggestion: (segment: 'origin' | 'destination', suggestion: GeocodingSuggestion) => void
  onPickFromMap: (segment: 'origin' | 'destination') => void
}

function LocationFieldset({
  legend,
  segment,
  value,
  mapSelectionTarget,
  onAddressInput,
  onSelectSuggestion,
  onPickFromMap,
}: {
  legend: string
  segment: 'origin' | 'destination'
  value: RouteInputValue
  mapSelectionTarget: 'origin' | 'destination' | null
  onAddressInput: (segment: 'origin' | 'destination', value: string) => void
  onSelectSuggestion: (segment: 'origin' | 'destination', suggestion: GeocodingSuggestion) => void
  onPickFromMap: (segment: 'origin' | 'destination') => void
}) {
  const [suggestions, setSuggestions] = useState<GeocodingSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const rootRef = useRef<HTMLFieldSetElement | null>(null)

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
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          setSuggestions([])
        }
      } finally {
        setIsLoading(false)
      }
    }, 250)

    return () => {
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [value.address])

  const showSuggestions = isFocused && value.address.trim().length >= 2
  const isUsingMapPicker = mapSelectionTarget === segment
  const hasResolvedCoordinates = value.lat !== null && value.lng !== null

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    onAddressInput(segment, event.target.value)
    setIsFocused(true)
  }

  return (
    <fieldset ref={rootRef} className="space-y-3 rounded-xl bg-soft p-4">
      <legend className="flex items-center gap-1 px-1 text-sm font-medium">
        <MapPin className="h-4 w-4 text-foreground" />
        {legend}
      </legend>

      <div className="relative">
        <Input
          placeholder={`Search ${legend.toLowerCase()} address`}
          value={value.address}
          onChange={handleInputChange}
          onFocus={() => setIsFocused(true)}
          required
          className="pr-10 bg-softer"
        />
        {isLoading && (
          <LoaderCircle className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}

        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-20 mt-2 w-full rounded-xl bg-background shadow-elev-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                type="button"
                className="block w-full border-b border-border px-3 py-2 text-left text-sm last:border-b-0 hover:bg-soft"
                onClick={() => {
                  onSelectSuggestion(segment, suggestion)
                  setIsFocused(false)
                }}
              >
                <span className="block font-medium">{suggestion.label}</span>
                <span className="block text-xs text-muted-foreground">{suggestion.address}</span>
              </button>
            ))}
          </div>
        )}

        {showSuggestions && !isLoading && suggestions.length === 0 && value.address.trim().length >= 2 && (
          <div className="absolute z-20 mt-2 w-full rounded-xl bg-background px-3 py-2 text-sm text-muted-foreground shadow-elev-2">
            No matching places found.
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-background px-3 py-2 text-sm">
        <div className="space-y-1">
          <p className="font-medium text-foreground">
            {hasResolvedCoordinates ? 'Location selected' : 'No location selected yet'}
          </p>
          <p className="text-xs text-muted-foreground">
            {hasResolvedCoordinates
              ? `${value.lat?.toFixed(5)}, ${value.lng?.toFixed(5)}`
              : 'Pick from autocomplete or use the map.'}
          </p>
        </div>
        <Button variant={isUsingMapPicker ? 'default' : 'outline'} size="sm" onClick={() => onPickFromMap(segment)}>
          <MapPinned className="mr-2 h-4 w-4" />
          {isUsingMapPicker ? 'Click the map…' : 'Pick on map'}
        </Button>
      </div>
    </fieldset>
  )
}

export function RouteInputForm({
  origin,
  destination,
  mapSelectionTarget,
  onAddressInput,
  onSelectSuggestion,
  onPickFromMap,
}: RouteInputFormProps) {
  return (
    <div className="space-y-4">
      <LocationFieldset
        legend="Origin"
        segment="origin"
        value={origin}
        mapSelectionTarget={mapSelectionTarget}
        onAddressInput={onAddressInput}
        onSelectSuggestion={onSelectSuggestion}
        onPickFromMap={onPickFromMap}
      />
      <LocationFieldset
        legend="Destination"
        segment="destination"
        value={destination}
        mapSelectionTarget={mapSelectionTarget}
        onAddressInput={onAddressInput}
        onSelectSuggestion={onSelectSuggestion}
        onPickFromMap={onPickFromMap}
      />
    </div>
  )
}
