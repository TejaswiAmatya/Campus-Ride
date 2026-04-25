import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  LoaderCircle,
  LocateFixed,
  MapPin,
  MapPinned,
  MessageSquare,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { MapView } from '@/components/MapView'
import { useRide } from '@/features/rides/hooks'
import { reverseGeocode, searchPlaces, type GeocodingSuggestion } from '@/features/rides/geocoding'
import { useBookRide } from './hooks'

interface CheckoutLocation {
  address: string
  lat: number | null
  lng: number | null
}

function LocationFieldset({
  legend,
  tone,
  value,
  isSelectingFromMap,
  onAddressInput,
  onSelectSuggestion,
  onPickFromMap,
}: {
  legend: string
  tone: string
  value: CheckoutLocation
  isSelectingFromMap: boolean
  onAddressInput: (value: string) => void
  onSelectSuggestion: (suggestion: GeocodingSuggestion) => void
  onPickFromMap: () => void
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

  const hasResolvedCoordinates = value.lat !== null && value.lng !== null
  const showSuggestions = isFocused && value.address.trim().length >= 2

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    onAddressInput(event.target.value)
    setIsFocused(true)
  }

  return (
    <fieldset ref={rootRef} className="space-y-3 rounded-lg border p-4">
      <legend className="flex items-center gap-1 px-1 text-sm font-medium">
        <MapPin className={`h-4 w-4 ${tone}`} />
        {legend}
      </legend>

      <div className="relative">
        <Input
          placeholder={`Search ${legend.toLowerCase()} address`}
          value={value.address}
          onChange={handleInputChange}
          onFocus={() => setIsFocused(true)}
        />
        {isLoading && (
          <LoaderCircle className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}

        {showSuggestions && suggestions.length > 0 && (
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

        {showSuggestions && !isLoading && suggestions.length === 0 && value.address.trim().length >= 2 && (
          <div className="absolute z-20 mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground shadow-lg">
            No matching places found.
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-muted/30 px-3 py-2 text-sm">
        <div className="space-y-1">
          <p className="font-medium text-foreground">
            {hasResolvedCoordinates ? 'Location selected' : 'Choose a point for this stop'}
          </p>
          <p className="text-xs text-muted-foreground">
            {hasResolvedCoordinates
              ? `${value.lat?.toFixed(5)}, ${value.lng?.toFixed(5)}`
              : 'Search by address or pick directly from the map.'}
          </p>
        </div>
        <Button variant={isSelectingFromMap ? 'default' : 'outline'} size="sm" type="button" onClick={onPickFromMap}>
          <MapPinned className="mr-2 h-4 w-4" />
          {isSelectingFromMap ? 'Click the map...' : 'Pick on map'}
        </Button>
      </div>
    </fieldset>
  )
}

export function BookingCheckoutPage() {
  const { rideId } = useParams<{ rideId: string }>()
  const { data: ride, isLoading, isError } = useRide(rideId)
  const [seats, setSeats] = useState(1)
  const [pickup, setPickup] = useState<CheckoutLocation>({ address: '', lat: null, lng: null })
  const [dropoff, setDropoff] = useState<CheckoutLocation>({ address: '', lat: null, lng: null })
  const [messageToDriver, setMessageToDriver] = useState('')
  const [mapSelectionTarget, setMapSelectionTarget] = useState<'pickup' | 'dropoff' | null>(null)
  const [mapError, setMapError] = useState<string | null>(null)
  const bookMutation = useBookRide()

  useEffect(() => {
    if (!ride) {
      return
    }

    setSeats(1)
    setPickup({
      address: ride.originAddress,
      lat: ride.originLat,
      lng: ride.originLng,
    })
    setDropoff({
      address: ride.destinationAddress,
      lat: ride.destinationLat,
      lng: ride.destinationLng,
    })
    setMessageToDriver('')
    setMapSelectionTarget(null)
    setMapError(null)
  }, [ride?.id])

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="animate-pulse text-muted-foreground">Loading ride...</p>
      </div>
    )
  }

  if (isError || !ride) {
    return (
      <div className="mx-auto max-w-lg space-y-4 rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground">This ride could not be loaded.</p>
        <Button asChild variant="outline">
          <Link to="/rides">Back to rides</Link>
        </Button>
      </div>
    )
  }

  const maxBookable = Math.min(ride.availableSeats, 8)
  const estimatedTotal = (Number(ride.pricePerSeat) * seats).toFixed(2)

  const handleLocationInput = (segment: 'pickup' | 'dropoff', address: string) => {
    const setter = segment === 'pickup' ? setPickup : setDropoff
    setter((current) => ({
      ...current,
      address,
      lat: null,
      lng: null,
    }))
  }

  const handleLocationSelect = (segment: 'pickup' | 'dropoff', suggestion: GeocodingSuggestion) => {
    const setter = segment === 'pickup' ? setPickup : setDropoff
    setter({
      address: suggestion.address,
      lat: suggestion.lat,
      lng: suggestion.lng,
    })
    setMapError(null)
  }

  const handleMapClick = async (position: [number, number]) => {
    if (!mapSelectionTarget) {
      return
    }

    try {
      setMapError(null)
      const suggestion = await reverseGeocode(position[0], position[1])
      handleLocationSelect(mapSelectionTarget, suggestion)
      setMapSelectionTarget(null)
    } catch {
      setMapError('Could not resolve that map location. Try another point or use address search.')
    }
  }

  const pickupMatchesRideOrigin =
    pickup.lat === ride.originLat && pickup.lng === ride.originLng && pickup.address === ride.originAddress
  const dropoffMatchesRideDestination =
    dropoff.lat === ride.destinationLat &&
    dropoff.lng === ride.destinationLng &&
    dropoff.address === ride.destinationAddress

  const markers: Array<{
    position: [number, number]
    label: string
    type: 'origin' | 'destination' | 'default'
  }> = []

  if (!pickupMatchesRideOrigin) {
    markers.push({
      position: [ride.originLat, ride.originLng],
      label: `Ride origin: ${ride.originAddress}`,
      type: 'origin',
    })
  }

  if (!dropoffMatchesRideDestination) {
    markers.push({
      position: [ride.destinationLat, ride.destinationLng],
      label: `Ride destination: ${ride.destinationAddress}`,
      type: 'destination',
    })
  }

  if (pickup.lat !== null && pickup.lng !== null) {
    markers.push({
      position: [pickup.lat, pickup.lng],
      label: `Your pickup: ${pickup.address}`,
      type: 'default',
    })
  }

  if (dropoff.lat !== null && dropoff.lng !== null) {
    markers.push({
      position: [dropoff.lat, dropoff.lng],
      label: `Your drop-off: ${dropoff.address}`,
      type: 'default',
    })
  }

  const mapCenter: [number, number] =
    markers.length === 0
      ? [ride.originLat, ride.originLng]
      : [
          markers.reduce((sum, marker) => sum + marker.position[0], 0) / markers.length,
          markers.reduce((sum, marker) => sum + marker.position[1], 0) / markers.length,
        ]

  const handleSubmit = () => {
    if (pickup.lat === null || pickup.lng === null || dropoff.lat === null || dropoff.lng === null) {
      setMapError('Select both pickup and drop-off points from search or by clicking the map.')
      return
    }

    bookMutation.mutate({
      rideId: ride.id,
      seatsBooked: seats,
      pickup: {
        address: pickup.address,
        lat: pickup.lat,
        lng: pickup.lng,
      },
      dropoff: {
        address: dropoff.address,
        lat: dropoff.lat,
        lng: dropoff.lng,
      },
      messageToDriver: messageToDriver.trim() || undefined,
    })
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Ride checkout
        </div>
        <h1 className="text-2xl font-bold">Reserve your seat</h1>
        <p className="text-sm text-muted-foreground">
          Confirm your seats, fine-tune your pickup and drop-off points, and leave the driver a quick note if needed.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
        <Card className="overflow-hidden border-primary/15 shadow-md">
          <CardHeader className="bg-gradient-to-r from-primary/10 via-primary/5 to-background">
            <CardTitle className="flex items-start gap-2 text-lg">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <span>
                {ride.originAddress} to {ride.destinationAddress}
              </span>
            </CardTitle>
            <CardDescription>
              {new Date(ride.departureTime).toLocaleString()} · {ride.availableSeats} seat(s) left
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <MapView center={mapCenter} markers={markers} height="h-72" onMapClick={handleMapClick} />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <LocateFixed className="h-4 w-4" />
              <span>
                {mapSelectionTarget
                  ? `Click the map to set your ${mapSelectionTarget} point.`
                  : 'Pickup and drop-off default to the ride route. Change them with address search or by clicking the map.'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/20 p-3">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Price per seat</p>
                <p className="text-sm font-semibold">{ride.pricePerSeat} NOK</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Driver</p>
                <p className="text-sm font-semibold">{ride.driver.name}</p>
              </div>
            </div>

            <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 text-sm">
              <div className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <div>
                  <p className="font-medium text-emerald-900">Before you book</p>
                  <p className="text-emerald-800/80">
                    Make sure your selected points are realistic for the driver to reach and mention anything useful like
                    landmark details or building entrances.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
              <p className="font-medium text-foreground">Simulated payment capture</p>
              <p className="text-muted-foreground">
                This checkout uses a simulated payment provider for now. Your booking response will include captured
                payment status and refund details, while keeping the backend ready for a future Stripe swap.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/10">
          <CardHeader>
            <CardTitle>Passenger details</CardTitle>
            <CardDescription>These details will be stored on the booking and shown to the driver.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="seats" className="flex items-center gap-2 text-sm font-medium">
                <Users className="h-4 w-4" />
                Seats to book
              </label>
              <Input
                id="seats"
                type="number"
                min={1}
                max={maxBookable}
                value={seats}
                onChange={(e) => setSeats(Math.max(1, Math.min(maxBookable, Number(e.target.value) || 1)))}
              />
              <p className="text-xs text-muted-foreground">
                {ride.pricePerSeat} NOK × {seats} ={' '}
                <span className="font-medium text-foreground">{estimatedTotal} NOK</span> (estimated)
              </p>
            </div>

            <LocationFieldset
              legend="Pickup point"
              tone="text-green-600"
              value={pickup}
              isSelectingFromMap={mapSelectionTarget === 'pickup'}
              onAddressInput={(value) => handleLocationInput('pickup', value)}
              onSelectSuggestion={(suggestion) => handleLocationSelect('pickup', suggestion)}
              onPickFromMap={() =>
                setMapSelectionTarget((current) => (current === 'pickup' ? null : 'pickup'))
              }
            />

            <LocationFieldset
              legend="Drop-off point"
              tone="text-red-500"
              value={dropoff}
              isSelectingFromMap={mapSelectionTarget === 'dropoff'}
              onAddressInput={(value) => handleLocationInput('dropoff', value)}
              onSelectSuggestion={(suggestion) => handleLocationSelect('dropoff', suggestion)}
              onPickFromMap={() =>
                setMapSelectionTarget((current) => (current === 'dropoff' ? null : 'dropoff'))
              }
            />

            <div className="space-y-2">
              <label htmlFor="messageToDriver" className="flex items-center gap-2 text-sm font-medium">
                <MessageSquare className="h-4 w-4" />
                Message to driver
                <span className="text-xs font-normal text-muted-foreground">(optional)</span>
              </label>
              <textarea
                id="messageToDriver"
                value={messageToDriver}
                onChange={(event) => setMessageToDriver(event.target.value)}
                maxLength={1000}
                rows={4}
                placeholder="Example: I'll be waiting outside the library entrance in a blue jacket."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="text-right text-xs text-muted-foreground">{messageToDriver.length}/1000</p>
            </div>

            {(bookMutation.isError || mapError) && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  {mapError ??
                    'Could not complete booking. The ride may be full or no longer available. Try refreshing the ride page.'}
                </span>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-wrap justify-between gap-2">
            <Button asChild variant="outline">
              <Link to={`/rides/${ride.id}`}>Back to ride</Link>
            </Button>
            <Button
              size="lg"
              className="min-w-[180px]"
              disabled={
                bookMutation.isPending ||
                ride.availableSeats < 1 ||
                seats < 1 ||
                seats > maxBookable ||
                pickup.lat === null ||
                pickup.lng === null ||
                dropoff.lat === null ||
                dropoff.lng === null
              }
              onClick={handleSubmit}
            >
              {bookMutation.isPending ? (
                'Booking...'
              ) : (
                <>
                  Confirm booking
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
