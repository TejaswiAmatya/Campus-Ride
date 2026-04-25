import type { ReactNode } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import type { LatLngExpression } from 'leaflet'
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
      <MapClickHandler onMapClick={onMapClick} />
      {children}
    </MapContainer>
  )
}
