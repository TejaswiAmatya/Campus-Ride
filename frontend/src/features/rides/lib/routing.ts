export interface RoutePoint {
  lat: number
  lng: number
}

export interface RoutePreview {
  geometry: Array<[number, number]>
  distanceMeters: number
  durationSeconds: number
}

const MAX_SAVED_ROUTE_POINTS = 120

interface OsrmResponse {
  code: string
  routes?: Array<{
    geometry: {
      coordinates: Array<[number, number]>
    }
    distance: number
    duration: number
  }>
}

function hasValidPoint(point: RoutePoint | null | undefined): point is RoutePoint {
  return !!point && Number.isFinite(point.lat) && Number.isFinite(point.lng)
}

export function formatRouteDistance(distanceMeters: number): string {
  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters)} m`
  }

  return `${(distanceMeters / 1000).toFixed(1)} km`
}

export function formatRouteDuration(durationSeconds: number): string {
  const totalMinutes = Math.round(durationSeconds / 60)

  if (totalMinutes < 60) {
    return `${totalMinutes} min`
  }

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return minutes === 0 ? `${hours} hr` : `${hours} hr ${minutes} min`
}

export function serializeRouteGeometry(geometry: Array<[number, number]>): string {
  if (geometry.length === 0) {
    return '[]'
  }

  const normalized =
    geometry.length <= MAX_SAVED_ROUTE_POINTS
      ? geometry
      : Array.from({ length: MAX_SAVED_ROUTE_POINTS }, (_, index) => {
          const sourceIndex = Math.round((index / (MAX_SAVED_ROUTE_POINTS - 1)) * (geometry.length - 1))
          return geometry[sourceIndex]
        })

  return JSON.stringify(
    normalized.map(([lat, lng]) => [Number(lat.toFixed(5)), Number(lng.toFixed(5))]),
  )
}

export async function fetchRoutePreview(
  points: RoutePoint[],
  signal?: AbortSignal,
): Promise<RoutePreview> {
  const validPoints = points.filter(hasValidPoint)

  if (validPoints.length < 2) {
    throw new Error('At least two route points are required')
  }

  const coordinates = validPoints.map((point) => `${point.lng},${point.lat}`).join(';')
  const params = new URLSearchParams({
    overview: 'full',
    geometries: 'geojson',
    steps: 'false',
  })

  const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${coordinates}?${params.toString()}`, {
    signal,
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch route preview')
  }

  const data = (await response.json()) as OsrmResponse

  if (data.code !== 'Ok' || !data.routes?.[0]) {
    throw new Error('No route could be calculated')
  }

  const route = data.routes[0]

  return {
    geometry: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    distanceMeters: route.distance,
    durationSeconds: route.duration,
  }
}
