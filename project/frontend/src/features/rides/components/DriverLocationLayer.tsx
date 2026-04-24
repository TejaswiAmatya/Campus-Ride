import { CircleMarker, Popup } from 'react-leaflet'
import type { DriverLocation } from '../hooks'

export function DriverLocationLayer({ location }: { location: DriverLocation | null }) {
  if (!location) {
    return null
  }

  return (
    <CircleMarker
      center={[location.lat, location.lng]}
      radius={10}
      pathOptions={{
        color: '#1d4ed8',
        fillColor: '#60a5fa',
        fillOpacity: 0.85,
        weight: 2,
      }}
    >
      <Popup>
        Driver location updated {new Date(location.updatedAt).toLocaleTimeString()}
      </Popup>
    </CircleMarker>
  )
}
