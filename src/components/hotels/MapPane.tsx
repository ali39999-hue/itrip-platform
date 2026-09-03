'use client';

import { useEffect, useMemo } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Star } from 'lucide-react';
import { Link } from '@/i18n/routing';
import type { Hotel } from '@/lib/types';

const CENTER: L.LatLngExpression = [41.008, 28.978];
const BRAND = 'var(--color-brand)';

interface HotelWithCoord extends Hotel {
  location?: { lat: number; lng: number };
}

function hotelPos(h: HotelWithCoord): L.LatLngExpression {
  if (h.location?.lat && h.location?.lng) {
    return [h.location.lat, h.location.lng];
  }
  const seed = [...h.id].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7) >>> 0;
  const lat = 35.6892 - ((seed % 97) / 97) * 0.08;
  const lng = 51.3890 + (((seed >> 7) % 113) / 113) * 0.12;
  return [lat, lng];
}

function pricePin(h: Hotel): L.DivIcon {
  const label = `${(h.pricePerNight / 1000000).toLocaleString('fa-IR', { maximumFractionDigits: 1 })}م`;
  return L.divIcon({
    className: 'firuzo-pin',
    html: `<span style="position:relative;display:inline-flex;align-items:center;justify-content:center;width:52px;height:30px;border-radius:9px;background:${BRAND};color:var(--color-surface);font-weight:800;font-size:12px;font-family:inherit;white-space:nowrap;box-shadow:0 4px 12px rgba(10,50,54,.35);cursor:pointer"><span style="position:absolute;bottom:-6px;left:50%;transform:translateX(-50%);width:0;height:0;border:7px solid transparent;border-top-color:${BRAND};border-bottom:0"></span>${label}</span>`,
    iconSize: [52, 30],
    iconAnchor: [26, 37],
    popupAnchor: [0, -34],
  });
}

function FitToPins({ points }: { points: L.LatLngExpression[] }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    map.fitBounds(L.latLngBounds(points), { padding: [44, 44] });
  }, [map, points]);
  return null;
}

export default function MapPane({ hotels }: { hotels: Hotel[] }) {
  const pins = useMemo(
    () =>
      hotels.map((h) => ({
        hotel: h,
        pos: hotelPos(h),
        icon: pricePin(h),
      })),
    [hotels]
  );
  const points = useMemo(() => pins.map((p) => p.pos), [pins]);

  return (
    <div className="h-full w-full" dir="ltr">
      <MapContainer center={CENTER} zoom={13} scrollWheelZoom={false} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitToPins points={points} />
        {pins.map(({ hotel, pos, icon }) => (
          <Marker key={hotel.id} position={pos} icon={icon}>
            <Popup className="firuzo-map-popup">
              <div dir="rtl" className="min-w-[180px] font-sans p-1">
                <div className="flex items-center gap-1.5 flex-wrap mb-1">
                  <b className="text-xs font-black text-ink">{hotel.name}</b>
                  <span className="inline-flex text-gold">
                    {Array.from({ length: hotel.stars }).map((_, i) => (
                      <Star key={i} size={11} className="fill-gold text-gold" />
                    ))}
                  </span>
                </div>
                <div className="text-[11px] text-sub mb-1.5 font-medium">
                  {hotel.city} · {hotel.distanceFromCenter}
                </div>
                <div className="text-xs font-black text-ink mb-2 font-mono">
                  {(hotel.pricePerNight / 1000000).toLocaleString('fa-IR')} میلیون تومان / شب
                </div>
                <Link
                  href={`/hotels/${hotel.id}`}
                  className="inline-flex items-center justify-center h-8 px-3 rounded-lg bg-brand hover:bg-brand-dark text-surface text-xs font-black transition shadow-xs"
                >
                  مشاهده اتاق‌ها ←
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
