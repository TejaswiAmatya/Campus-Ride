import { useEffect, type ReactNode } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet'
import type { LatLngBoundsExpression, LatLngExpression } from 'leaflet'
import L from 'leaflet'
import { cn } from '@/lib/utils'

// Fix the missing marker icon that occurs when bundlers process Leaflet
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

export interface MapMarker {
  position: [number, number]
  label?: string
  /** 'origin' renders a green marker, 'destination' renders a red one (future enhancement) */
  type?: 'origin' | 'destination' | 'driver' | 'default'
}

interface MapViewProps {
  /** Map centre [lat, lng]. Defaults to University of Stavanger. */
  center?: [number, number]
  zoom?: number
  markers?: MapMarker[]
  className?: string
  /** Height override — default is h-64 */
  height?: string
  children?: ReactNode
  onMapClick?: (position: [number, number]) => void
  routePath?: Array<[number, number]>
}

function MapClickHandler({ onMapClick }: { onMapClick?: (position: [number, number]) => void }) {
  useMapEvents({
    click(event) {
      if (!onMapClick) {
        return
      }

      onMapClick([event.latlng.lat, event.latlng.lng])
    },
  })

  return null
}

function MapViewport({
  center,
  markers,
  routePath,
}: {
  center: [number, number]
  markers: MapMarker[]
  routePath: Array<[number, number]>
}) {
  const map = useMap()

  useEffect(() => {
    const points = [
      ...markers.map((marker) => marker.position),
      ...routePath,
    ]

    if (points.length >= 2) {
      map.fitBounds(points as LatLngBoundsExpression, {
        padding: [36, 36],
      })
      return
    }

    map.setView(center as LatLngExpression)
  }, [center, map, markers, routePath])

  return null
}

/**
 * Shared Leaflet map component used by Rides (route display) and Bookings (pickup/dropoff).
 *
 * Sprint 2 additions:
 *  - Click handler to let users select pickup/dropoff points
 *  - Nominatim reverse-geocoding to convert lat/lng → address strings
 *  - Polyline to draw the route between origin and destination
 *  - DriverLocationLayer: subscribes to driver:location Socket.io events and
 *    animates the driver marker in real time
 */
export function MapView({
  center = [58.9, 5.71], // University of Stavanger
  zoom = 13,
  markers = [],
  className,
  height = 'h-64',
  children,
  onMapClick,
  routePath = [],
}: MapViewProps) {
  return (
    <MapContainer
      center={center as LatLngExpression}
      zoom={zoom}
      className={cn('w-full rounded-lg border', height, className)}
      style={{ minHeight: '200px' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {markers.map((marker, i) => (
        <Marker key={i} position={marker.position as LatLngExpression}>
          {marker.label && <Popup>{marker.label}</Popup>}
        </Marker>
      ))}
      {routePath.length > 1 && (
        <Polyline
          positions={routePath as LatLngExpression[]}
          pathOptions={{
            color: '#0f766e',
            weight: 5,
            opacity: 0.8,
          }}
        />
      )}
      <MapClickHandler onMapClick={onMapClick} />
      <MapViewport center={center} markers={markers} routePath={routePath} />
      {children}
    </MapContainer>
  )
}
