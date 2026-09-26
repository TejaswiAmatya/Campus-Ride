import { CircleMarker, Popup } from 'react-leaflet'
import type { DriverLocation } from '../hooks/useRides'

export function DriverLocationLayer({ location }: { location: DriverLocation | null }) {
  if (!location) {
    return null
  }

  return (
    <CircleMarker
      center={[location.lat, location.lng]}
      radius={10}
      pathOptions={{
        color: '#000000',
        fillColor: '#282828',
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
