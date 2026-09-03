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

interface HotelMapProps {
  hotelId: string;
  hotelName: string;
  city?: string;
  location?: { lat: number; lng: number };
}

const CITY_COORDS: Record<string, [number, number]> = {
  // Iran
  'تهران': [35.6892, 51.3890],
  'Tehran': [35.6892, 51.3890],
  'مشهد': [36.2972, 59.6067],
  'Mashhad': [36.2972, 59.6067],
  'اصفهان': [32.6546, 51.6680],
  'Isfahan': [32.6546, 51.6680],
  'شیراز': [29.5918, 52.5837],
  'Shiraz': [29.5918, 52.5837],
  'کیش': [26.5325, 53.9897],
  'Kish': [26.5325, 53.9897],
  'تبریز': [38.0800, 46.2919],
  'Tabriz': [38.0800, 46.2919],
  'یزد': [31.8974, 54.3569],
  'Yazd': [31.8974, 54.3569],
  // Turkey
  'استانبول': [41.0082, 28.9784],
  'Istanbul': [41.0082, 28.9784],
  'آنتالیا': [36.8969, 30.7133],
  'Antalya': [36.8969, 30.7133],
  // UAE
  'دبی': [25.2048, 55.2708],
  'Dubai': [25.2048, 55.2708],
  // China
  'پکن': [39.9042, 116.4074],
  'Beijing': [39.9042, 116.4074],
  // Russia
  'مسکو': [55.7558, 37.6173],
  'Moscow': [55.7558, 37.6173],
  // Georgia
  'تفلیس': [41.7151, 44.8271],
  'Tbilisi': [41.7151, 44.8271],
  // Oman
  'مسقط': [23.5880, 58.3829],
  'Muscat': [23.5880, 58.3829],
};

function getHotelPos(id: string, city?: string, location?: { lat: number; lng: number }): [number, number] {
  if (location && location.lat && location.lng) {
    return [location.lat, location.lng];
  }
  const base = city && (CITY_COORDS[city] || CITY_COORDS[city.trim()]);
  if (base) {
    const seed = [...id].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7) >>> 0;
    const latOffset = ((seed % 97) / 97 - 0.5) * 0.04;
    const lngOffset = (((seed >> 7) % 113) / 113 - 0.5) * 0.04;
    return [base[0] + latOffset, base[1] + lngOffset];
  }
  const seed = [...id].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7) >>> 0;
  return [
    35.6892 + ((seed % 97) / 97 - 0.5) * 0.05,
    51.3890 + (((seed >> 7) % 113) / 113 - 0.5) * 0.05
  ];
}

export default function HotelMap({ hotelId, hotelName, city, location }: HotelMapProps) {
  const pos = getHotelPos(hotelId, city, location);

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
