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
  culture: 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?auto=format&fit=crop&w=800&q=80',
  nature: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
  wellness: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80',
  nightlife: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
  adventure: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80',
  theater: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&w=800&q=80',
  exhibition: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80',
};

export const HOTEL_IMAGE_MAP: Record<string, string> = {
  h1: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80', // Mashhad Darvishi Luxury Suite
  h2: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80', // Tehran Espinas Palace Grand Lobby
  h3: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80', // Isfahan Abbasi Historic Courtyard
  h4: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80', // Shiraz Grand Hotel
  h5: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80', // Kish Toranj Sea Resort
  h6: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=800&q=80', // Tabriz Pars El-Goli Hotel
  h7: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=800&q=80', // Yazd Moshir Historic Garden
  h8: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=800&q=80', // Istanbul Bosphorus Palace
  h9: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=800&q=80', // Dubai Downtown Skyline Hotel
  h10: 'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=800&q=80', // Tbilisi Old Town Boutique Hotel
};

const DIVERSE_HOTEL_FALLBACKS = [
  'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=800&q=80',
];

export function getHotelImage(hotel: { id?: string; imageQuery?: string; name?: string }) {
  if (hotel.id && HOTEL_IMAGE_MAP[hotel.id]) {
    return HOTEL_IMAGE_MAP[hotel.id];
  }
  const key = hotel.id || hotel.name || hotel.imageQuery || 'default';
  const hash = [...key].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return DIVERSE_HOTEL_FALLBACKS[hash % DIVERSE_HOTEL_FALLBACKS.length];
}

export const DESTINATION_IMAGE_MAP: Record<string, string> = {
  // Iran
  Tehran: 'https://images.unsplash.com/photo-1579762715118-a6f1d4b934f1?auto=format&fit=crop&w=800&q=80', // Tehran Milad Tower & Alborz
  Mashhad: 'https://images.unsplash.com/photo-1584551246679-0daf3d275d0f?auto=format&fit=crop&w=800&q=80', // Mashhad Grand Islamic Architecture
  Isfahan: 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=800&q=80', // Isfahan Naqsh-e Jahan Square
  Shiraz: 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?auto=format&fit=crop&w=800&q=80', // Shiraz Historic Architecture
  Kish: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80', // Kish Coral Coast
  Tabriz: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=800&q=80', // Tabriz Grand Bazaar
  Yazd: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80', // Yazd Desert Windcatchers
  // Turkey
  Istanbul: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=800&q=80', // Istanbul Hagia Sophia & Bosphorus
  Antalya: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80', // Antalya Mediterranean Coast
  Izmir: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=800&q=80', // Izmir Aegean Waterfront
  Trabzon: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80', // Trabzon Black Sea Green Mountains
  Bodrum: 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?auto=format&fit=crop&w=800&q=80', // Bodrum Castle Marina
  // UAE
  Dubai: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=800&q=80', // Dubai Burj Khalifa & Downtown
  'Abu Dhabi': 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=800&q=80', // Abu Dhabi Sheikh Zayed Grand Mosque
  Sharjah: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80', // Sharjah Cultural Heritage
  // Georgia
  Tbilisi: 'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=800&q=80', // Tbilisi Old Town & Narikala Fortress
  Batumi: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80', // Batumi Black Sea Boulevard
  // Oman
  Muscat: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80', // Muscat Sultan Qaboos Grand Mosque & Corniche
  Salalah: 'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=800&q=80', // Salalah Lush Khareef Greenery
  // Russia
  Moscow: 'https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?auto=format&fit=crop&w=800&q=80', // Moscow Red Square & Saint Basil's Cathedral
  'Saint Petersburg': 'https://images.unsplash.com/photo-1556610961-2fecc5927173?auto=format&fit=crop&w=800&q=80', // Saint Petersburg Hermitage Palace
  Sochi: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80', // Sochi Caucasus Mountains & Black Sea
  // China
  Beijing: 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?auto=format&fit=crop&w=800&q=80', // Beijing Forbidden City & Great Wall
  Shanghai: 'https://images.unsplash.com/photo-1538428494232-9c0d8a3ab403?auto=format&fit=crop&w=800&q=80', // Shanghai The Bund & Lujiazui Skyline
  Guangzhou: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80', // Guangzhou Canton Tower & Pearl River
};
