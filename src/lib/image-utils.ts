export const shimmer = (w: number, h: number) => `<svg width="${w}" height="${h}" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <linearGradient id="g">
      <stop stop-color="#046e6b18" offset="20%" />
      <stop stop-color="#00a9a530" offset="50%" />
      <stop stop-color="#046e6b18" offset="70%" />
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="#f4f8f8" />
  <rect id="r" width="${w}" height="${h}" fill="url(#g)" />
  <animate xlink:href="#r" attributeName="x" from="-${w}" to="${w}" dur="1.2s" repeatCount="indefinite" />
</svg>`;

export const toBase64 = (str: string) =>
  typeof window === 'undefined' ? Buffer.from(str).toString('base64') : window.btoa(str);

export const shimmerDataUrl = (w: number = 700, h: number = 475) =>
  `data:image/svg+xml;base64,${toBase64(shimmer(w, h))}`;

export const CATEGORY_PHOTO_MAP: Record<string, string> = {
  yacht: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80',
  festival: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=800&q=80',
  culture: 'https://images.unsplash.com/photo-1565552684305-7e8f3b2a59e9?auto=format&fit=crop&w=800&q=80',
  nature: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
  wellness: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80',
  nightlife: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
  adventure: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80',
  theater: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&w=800&q=80',
  exhibition: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80',
};

export const HOTEL_IMAGE_MAP: Record<string, string> = {
  h1: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
  h2: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80',
  h3: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80',
  h4: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80',
  h5: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80',
  h6: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=800&q=80',
  h7: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=800&q=80',
};

export function getHotelImage(hotel: { id?: string; imageQuery?: string }) {
  if (hotel.id && HOTEL_IMAGE_MAP[hotel.id]) {
    return HOTEL_IMAGE_MAP[hotel.id];
  }
  return 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80';
}

export const DESTINATION_IMAGE_MAP: Record<string, string> = {
  // Iran
  Tehran: 'https://images.unsplash.com/photo-1579762715118-a6f1d4b934f1?auto=format&fit=crop&w=800&q=80',
  Mashhad: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
  Isfahan: 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=800&q=80',
  Shiraz: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=800&q=80',
  Kish: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80',
  Tabriz: 'https://images.unsplash.com/photo-1565552684305-7e8f3b2a59e9?auto=format&fit=crop&w=800&q=80',
  Yazd: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
  // Turkey
  Istanbul: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=800&q=80',
  Antalya: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80',
  Izmir: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=800&q=80',
  Trabzon: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80',
  Bodrum: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&w=800&q=80',
  // UAE
  Dubai: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=800&q=80',
  'Abu Dhabi': 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=800&q=80',
  Sharjah: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
  // Georgia
  Tbilisi: 'https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&w=800&q=80',
  Batumi: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80',
  Kazbegi: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
  // Russia
  Moscow: 'https://images.unsplash.com/photo-1513326738677-b964603b136d?auto=format&fit=crop&w=800&q=80',
  'Saint Petersburg': 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80',
  Sochi: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80',
  // Oman
  Muscat: 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=800&q=80',
  Salalah: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80',
  // China
  Beijing: 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?auto=format&fit=crop&w=800&q=80',
  Shanghai: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80',
  Guangzhou: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80',
};
