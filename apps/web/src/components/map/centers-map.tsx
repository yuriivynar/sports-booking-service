'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import Link from 'next/link';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';

export interface MapCenter {
  slug: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

// An HTML marker avoids Leaflet's default PNG icons, whose paths break in bundlers.
const markerIcon = L.divIcon({
  className: '',
  html: '<span class="block size-5 rounded-full border-[3px] border-white bg-primary shadow-md"></span>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -12],
});

/**
 * OpenStreetMap with a marker per center. Rendered only in the browser.
 * One center: centered on it. Several: zoomed so every marker fits.
 */
export default function CentersMap({
  centers,
  className,
  zoom = 15,
}: {
  centers: MapCenter[];
  className?: string;
  zoom?: number;
}) {
  const points = centers.map((c): [number, number] => [c.latitude, c.longitude]);
  const view =
    points.length > 1
      ? { bounds: L.latLngBounds(points), boundsOptions: { padding: [40, 40] as [number, number] } }
      : { center: points[0], zoom };

  return (
    <MapContainer {...view} scrollWheelZoom={false} className={className}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {centers.map((item) => (
        <Marker key={item.slug} position={[item.latitude, item.longitude]} icon={markerIcon}>
          <Popup>
            <p className="font-medium">{item.name}</p>
            <p>{item.address}</p>
            <Link href={`/centers/${item.slug}`}>Детальніше</Link>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
