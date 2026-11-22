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

// An HTML marker: a brand dot with a pulsing ring (CSS animation on transform
// and opacity only). It also avoids Leaflet's PNG icons, whose paths break in bundlers.
const markerIcon = L.divIcon({
  className: '',
  html: `<span class="relative flex size-6 items-center justify-center">
    <span class="absolute inline-flex size-full rounded-full bg-primary/60 animate-pulse-ring"></span>
    <span class="relative size-4 rounded-full border-[3px] border-white bg-primary shadow-glow"></span>
  </span>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -14],
});

// OpenStreetMap tiles. In the dark theme a CSS filter inverts them (see
// globals.css), which is cheaper than loading a second tile set.
const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

/**
 * Map of sport centers. Rendered only in the browser.
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
      ? { bounds: L.latLngBounds(points), boundsOptions: { padding: [48, 48] as [number, number] } }
      : { center: points[0], zoom };

  return (
    <MapContainer {...view} scrollWheelZoom={false} className={className}>
      <TileLayer attribution={ATTRIBUTION} url={TILES} />
      {centers.map((item) => (
        <Marker key={item.slug} position={[item.latitude, item.longitude]} icon={markerIcon}>
          <Popup>
            <p className="font-display font-bold">{item.name}</p>
            <p className="my-1">{item.address}</p>
            <Link href={`/centers/${item.slug}`} className="font-semibold">
              Детальніше →
            </Link>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
