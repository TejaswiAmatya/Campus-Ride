import { useEffect, type ReactNode } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet'
import type { LatLngBoundsExpression, LatLngExpression } from 'leaflet'
import L from 'leaflet'
import { cn } from '@/lib/utils'

function createMarkerIcon(type: MapMarker['type'] = 'default') {
  const color =
    type === 'origin'
      ? '#16a34a'
      : type === 'destination'
        ? '#ef4444'
        : type === 'driver'
          ? '#2563eb'
          : '#0f172a'

  return L.divIcon({
    className: 'campus-ride-marker',
    html: `
      <span
        style="
          display:block;
          width:18px;
          height:18px;
          border-radius:9999px;
          background:${color};
          border:3px solid white;
          box-shadow:0 2px 8px rgba(15, 23, 42, 0.35);
        "
      ></span>
    `,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10],
  })
}

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
        <Marker key={i} position={marker.position as LatLngExpression} icon={createMarkerIcon(marker.type)}>
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
