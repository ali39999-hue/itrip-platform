'use client';

import { useEffect, useMemo } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Star } from 'lucide-react';
import { Link } from '@/i18n/routing';
import { useLocale, useTranslations } from 'next-intl';
import type { Hotel } from '@/lib/types';

const DEFAULT_CENTER: L.LatLngExpression = [35.6892, 51.3890];
const BRAND = 'var(--color-brand)';

const CITY_COORDS_MAP: Record<string, [number, number]> = {
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

interface HotelWithCoord extends Hotel {
  location?: { lat: number; lng: number };
}

function hotelPos(h: HotelWithCoord): L.LatLngExpression {
  if (h.location?.lat && h.location?.lng) {
    return [h.location.lat, h.location.lng];
  }
  const cityBase = h.city && (CITY_COORDS_MAP[h.city] || CITY_COORDS_MAP[h.city.trim()]);
  if (cityBase) {
    const seed = [...h.id].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7) >>> 0;
    const latOffset = ((seed % 97) / 97 - 0.5) * 0.04;
    const lngOffset = (((seed >> 7) % 113) / 113 - 0.5) * 0.04;
    return [cityBase[0] + latOffset, cityBase[1] + lngOffset];
  }
  const seed = [...h.id].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7) >>> 0;
  const lat = 35.6892 + ((seed % 97) / 97 - 0.5) * 0.05;
  const lng = 51.3890 + (((seed >> 7) % 113) / 113 - 0.5) * 0.05;
  return [lat, lng];
}

function pricePin(h: Hotel, locale: string): L.DivIcon {
  const isRtl = ['fa', 'ar'].includes(locale);
  const localeTag = isRtl ? 'fa-IR' : 'en-US';
  const suffix: Record<string, string> = { fa: 'م', ar: 'م', en: 'M', zh: 'M', ru: 'М' };
  const label = `${(h.pricePerNight / 1000000).toLocaleString(localeTag, { maximumFractionDigits: 1 })}${suffix[locale] || 'M'}`;
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
  const locale = useLocale();
  const t = useTranslations('HotelDetail');
  const isRtl = ['fa', 'ar'].includes(locale);
  const localeTag = isRtl ? 'fa-IR' : 'en-US';

  const pins = useMemo(
    () =>
      hotels.map((h) => ({
        hotel: h,
        pos: hotelPos(h),
        icon: pricePin(h, locale),
      })),
    [hotels, locale]
  );
  const points = useMemo(() => pins.map((p) => p.pos), [pins]);

  const centerPos = useMemo<L.LatLngExpression>(() => {
    if (hotels.length > 0) {
      const first = hotels[0];
      if (first.city && CITY_COORDS_MAP[first.city]) {
        return CITY_COORDS_MAP[first.city];
      }
    }
    return DEFAULT_CENTER;
  }, [hotels]);

  return (
    <div className="h-full w-full" dir="ltr">
      <MapContainer center={centerPos} zoom={13} scrollWheelZoom={false} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitToPins points={points} />
        {pins.map(({ hotel, pos, icon }) => (
          <Marker key={hotel.id} position={pos} icon={icon}>
            <Popup className="firuzo-map-popup">
              <div dir={isRtl ? 'rtl' : 'ltr'} className="min-w-[180px] font-sans p-1">
                <div className="flex items-center gap-1.5 flex-wrap mb-1">
                  <b className="text-xs font-black text-ink">{isRtl ? hotel.name : (hotel.nameEn || hotel.name)}</b>
                  <span className="inline-flex text-gold">
                    {Array.from({ length: hotel.stars }).map((_, i) => (
                      <Star key={i} size={11} className="fill-gold text-gold" />
                    ))}
                  </span>
                </div>
                <div className="text-[11px] text-sub mb-1.5 font-medium">
                  {isRtl ? hotel.city : (hotel.cityEn || hotel.city)} · {hotel.distanceFromCenter}
                </div>
                <div className="text-xs font-black text-ink mb-2 font-mono">
                  {(hotel.pricePerNight / 1000000).toLocaleString(localeTag)} {t('millionPerNight')}
                </div>
                <Link
                  href={`/hotels/${hotel.id}`}
                  className="inline-flex items-center justify-center h-8 px-3 rounded-lg bg-brand hover:bg-brand-dark text-surface text-xs font-black transition shadow-xs"
                >
                  {t('viewRooms')}
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
