export interface GeocodingSuggestion {
  id: string
  label: string
  address: string
  lat: number
  lng: number
}

interface NominatimSearchResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
  name?: string
}

interface NominatimReverseResult {
  place_id: number
  display_name: string
  lat: string
  lon: string
  name?: string
}

function toSuggestion(result: NominatimSearchResult | NominatimReverseResult): GeocodingSuggestion {
  return {
    id: String(result.place_id),
    label: result.name?.trim() || result.display_name,
    address: result.display_name,
    lat: parseFloat(result.lat),
    lng: parseFloat(result.lon),
  }
}

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<GeocodingSuggestion[]> {
  if (!query.trim()) {
    return []
  }

  const params = new URLSearchParams({
    q: query.trim(),
    format: 'jsonv2',
    limit: '5',
    addressdetails: '1',
  })

  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    signal,
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Failed to search locations')
  }

  const data = (await response.json()) as NominatimSearchResult[]
  return data
    .map(toSuggestion)
    .filter((suggestion) => Number.isFinite(suggestion.lat) && Number.isFinite(suggestion.lng))
}

export async function reverseGeocode(lat: number, lng: number, signal?: AbortSignal): Promise<GeocodingSuggestion> {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: 'jsonv2',
    zoom: '18',
    addressdetails: '1',
  })

  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`, {
    signal,
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Failed to reverse geocode location')
  }

  const data = (await response.json()) as NominatimReverseResult
  return toSuggestion(data)
}
