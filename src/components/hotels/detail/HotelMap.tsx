'use client';

import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const BRAND = '#00a9a5';

const simplePin = typeof window !== 'undefined' ? L.divIcon({
  className: 'firuzo-pin',
  html: `<div style="width:24px;height:24px;background:${BRAND};border-radius:50%;border:3px solid white;box-shadow:0 3px 8px rgba(0,0,0,0.3)"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
}) : undefined;

function getHotelPos(id: string): [number, number] {
  const seed = [...id].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7) >>> 0;
  return [
    41.042 - ((seed % 97) / 97) * 0.062,
    28.936 + (((seed >> 7) % 113) / 113) * 0.098
  ];
}

export default function HotelMap({ hotelId, hotelName }: { hotelId: string; hotelName: string }) {
  const pos = getHotelPos(hotelId);

  return (
    <div className="relative h-full w-full">
      <MapContainer center={pos} zoom={14} scrollWheelZoom={false} className="h-full w-full absolute inset-0">
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {simplePin && <Marker position={pos} icon={simplePin} />}
      </MapContainer>
      <div className="absolute bottom-2 start-2 end-2 pointer-events-none z-[1000] flex justify-center">
        <span className="px-2.5 py-1 rounded-md bg-surface text-ink text-[11px] font-black shadow-sm border border-line pointer-events-auto">
          {hotelName}
        </span>
      </div>
    </div>
  );
}
