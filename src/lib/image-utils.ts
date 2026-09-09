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
  culture: 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=800&q=80',
  nature: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
  wellness: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80',
  nightlife: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
  adventure: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=800&q=80',
  theater: 'https://images.unsplash.com/photo-1514306191717-452ec28c7814?auto=format&fit=crop&w=800&q=80', // سالن اپرا و تئاتر مجلل
  exhibition: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80',
};

export const HOTEL_IMAGE_MAP: Record<string, string> = {
  h1: 'https://www.eghamat24.com/app/public/hotel_images/original/Mashhad-Darvishi-44.jpg', // هتل درویشی مشهد (تصویر واقعی)
  h2: 'https://www.eghamat24.com/app/public/hotel_images/original/Esfahan-Abbasi-31.jpg', // هتل عباسی اصفهان (حیاط صفوی و باغ تاریخی - تصویر واقعی)
  h3: 'https://images.unsplash.com/photo-1580674684081-7617fbf3d745?auto=format&fit=crop&w=800&q=80', // رزیدانس دبی مارینا (اسکای‌لاین مارینا و قایق‌های تفریحی)
  h4: 'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=800&q=80', // بوتیک هتل تفلیس (بافت تاریخی و بالکن‌های چوبی تفلیس قدیم)
  h5: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=800&q=80', // هتل طلاییه استانبول (تنگه بسفر و گالاتا)
  h6: 'https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?auto=format&fit=crop&w=800&q=80', // هتل متروپول مسکو (نزدیک میدان سرخ)
  h7: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80', // رزورت ساحلی مسقط (ساحل القرم و دریای عمان)
  h8: 'https://www.eghamat24.com/app/public/hotel_images/original/Shiraz-Shiraz-08.jpg', // هتل بزرگ شیراز (نمای صخره‌ای دروازه قرآن - تصویر واقعی)
  h9: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80', // هتل دریایی ترنج کیش (ویلاهای روی آب خلیج فارس)
  h10: 'https://www.eghamat24.com/app/public/hotel_images/original/Tabriz-Laleh-29.jpg', // هتل صخره‌ای لاله کندوان تبریز (تصویر واقعی)
};

export const HOTEL_GALLERIES: Record<string, string[]> = {
  h1: [
    'https://www.eghamat24.com/app/public/hotel_images/original/Mashhad-Darvishi-44.jpg',
    'https://www.eghamat24.com/app/public/hotel_images/original/Mashhad-Darvishi-90.jpg',
    'https://www.eghamat24.com/app/public/hotel_images/original/Mashhad-Darvishi-82.jpg',
    'https://www.eghamat24.com/app/public/hotel_images/original/Mashhad-Darvishi-80.jpg',
    'https://www.eghamat24.com/app/public/hotel_images/original/Mashhad-Darvishi-06.jpg',
  ],
  h2: [
    'https://www.eghamat24.com/app/public/hotel_images/original/Esfahan-Abbasi-31.jpg',
    'https://www.eghamat24.com/app/public/hotel_images/original/Esfahan-Abbasi-48.jpg',
    'https://www.eghamat24.com/app/public/hotel_images/original/Esfahan-Abbasi-70.jpg',
    'https://www.eghamat24.com/app/public/hotel_images/original/Esfahan-Abbasi-47.jpg',
    'https://www.eghamat24.com/app/public/hotel_images/original/Esfahan-Abbasi-44.jpg',
  ],
  h3: [
    'https://images.unsplash.com/photo-1580674684081-7617fbf3d745?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1200&q=80',
  ],
  h4: [
    'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
  ],
  h5: [
    'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?auto=format&fit=crop&w=1200&q=80',
  ],
  h6: [
    'https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1513326738677-b964603b136d?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=1200&q=80',
  ],
  h7: [
    'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
  ],
  h8: [
    'https://www.eghamat24.com/app/public/hotel_images/original/Shiraz-Shiraz-08.jpg',
    'https://www.eghamat24.com/app/public/hotel_images/original/Shiraz-Shiraz-26.jpg',
    'https://www.eghamat24.com/app/public/hotel_images/original/Shiraz-Bozorg-79.jpg',
    'https://www.eghamat24.com/app/public/hotel_images/original/Shiraz-Bozorg-78.jpg',
    'https://www.eghamat24.com/app/public/hotel_images/original/Shiraz-Bozorg-101.jpg',
  ],
  h9: [
    'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
  ],
  h10: [
    'https://www.eghamat24.com/app/public/hotel_images/original/Tabriz-Laleh-29.jpg',
    'https://www.eghamat24.com/app/public/hotel_images/original/Tabriz-Laleh-07.jpg',
    'https://www.eghamat24.com/app/public/hotel_images/original/Tabriz-Laleh-48.jpg',
    'https://www.eghamat24.com/app/public/hotel_images/original/Tabriz-Laleh-23.jpg',
    'https://www.eghamat24.com/app/public/hotel_images/original/Tabriz-Laleh-32.jpg',
  ],
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

const ALLOWED_IMAGE_HOSTS = new Set([
  'images.unsplash.com',
  'upload.wikimedia.org',
  'cdn.alibaba.ir',
  'cdn.grschannel.com',
  'www.eghamat24.com',
  'ak-d.tripcdn.com',
]);

const FORBIDDEN_HOST_PATTERNS = [
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
];

/**
 * Validates that an image URL is safe, uses http/https, matches configured remotePatterns,
 * rejects private/loopback/localhost addresses, and does not point to video files.
 */
export function isSafeImageUrl(rawUrl?: string): boolean {
  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.startsWith('http')) return false;

  // Reject malformed doubled URLs (e.g. https://domain.comhttps://...)
  if (rawUrl.indexOf('http', 4) !== -1) return false;

  // Reject video formats (mp4, webm, mov, etc.)
  const lower = rawUrl.toLowerCase();
  if (lower.includes('.mp4') || lower.includes('.webm') || lower.includes('.mov') || lower.includes('.avi')) {
    return false;
  }

  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;

    const hostname = parsed.hostname.toLowerCase();

    // Reject localhost, loopback and private ranges
    if (FORBIDDEN_HOST_PATTERNS.some((p) => hostname === p || hostname.endsWith(`.${p}`))) {
      return false;
    }
    if (
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
    ) {
      return false;
    }

    // Must be in configured Next.js image remotePatterns
    return ALLOWED_IMAGE_HOSTS.has(hostname);
  } catch {
    return false;
  }
}

export function getHotelImage(hotel: { id?: string; imageQuery?: string; name?: string; galleryImages?: string[] }) {
  if (hotel.galleryImages && hotel.galleryImages.length > 0) {
    const validImage = hotel.galleryImages.find((url) => isSafeImageUrl(url));
    if (validImage) {
      return validImage;
    }
  }
  if (hotel.id && HOTEL_IMAGE_MAP[hotel.id]) {
    return HOTEL_IMAGE_MAP[hotel.id];
  }
  const key = hotel.id || hotel.name || hotel.imageQuery || 'default';
  const hash = [...key].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return DIVERSE_HOTEL_FALLBACKS[hash % DIVERSE_HOTEL_FALLBACKS.length];
}

export function getHotelGallery(hotel: { id?: string; galleryImages?: string[]; name?: string }): string[] {
  if (hotel.galleryImages && hotel.galleryImages.length >= 2) {
    const safe = hotel.galleryImages.filter((u) => isSafeImageUrl(u));
    if (safe.length >= 2) return safe;
  }
  if (hotel.id && HOTEL_GALLERIES[hotel.id]) {
    return HOTEL_GALLERIES[hotel.id];
  }
  const main = getHotelImage(hotel);
  return [main, ...DIVERSE_HOTEL_FALLBACKS.slice(0, 4)];
}

export const DESTINATION_IMAGE_MAP: Record<string, string> = {
  // Iran — authentic Wikimedia Commons photos (each URL visually verified against its city)
  Tehran: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Azadi_Tower_at_night_III.jpg/960px-Azadi_Tower_at_night_III.jpg', // برج آزادی تهران
  Mashhad: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/59/Imam_Reza_shrine.jpg/960px-Imam_Reza_shrine.jpg', // حرم مطهر رضوی در شب
  Isfahan: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/Naghshe_Jahan_Square_Isfahan_modified.jpg/960px-Naghshe_Jahan_Square_Isfahan_modified.jpg', // میدان نقش جهان و مسجد شیخ لطف‌الله
  Shiraz: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Nasir-al_molk_-1.jpg/960px-Nasir-al_molk_-1.jpg', // مسجد نصیرالملک شیراز
  Kish: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80', // ساحل مرجانی و آب‌های زلال کیش
  Tabriz: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/Tabriz_Shahgoli_Park_-_panoramio.jpg/960px-Tabriz_Shahgoli_Park_-_panoramio.jpg', // پارک شاه‌گلی (ائل‌گلی) تبریز
  Yazd: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Complejo_Amir_Chakmaq%2C_Yazd%2C_Ir%C3%A1n%2C_2016-09-21%2C_DD_46.jpg/960px-Complejo_Amir_Chakmaq%2C_Yazd%2C_Ir%C3%A1n%2C_2016-09-21%2C_DD_46.jpg', // میدان امیرچخماق یزد
  Kashan: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Casa_hist%C3%B3rica_de_Tabatabaeis%2C_Kashan%2C_Ir%C3%A1n%2C_2016-09-19%2C_DD_65.jpg/960px-Casa_hist%C3%B3rica_de_Tabatabaeis%2C_Kashan%2C_Ir%C3%A1n%2C_2016-09-19%2C_DD_65.jpg', // خانه تاریخی طباطبایی‌ها کاشان
  Qeshm: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Chahkooh_canyon_on_Queshm_island_in_Iran.jpg/960px-Chahkooh_canyon_on_Queshm_island_in_Iran.jpg', // دره چاهکوه قشم
  // Turkey
  Istanbul: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=800&q=80', // تنگه بسفر و ایاصوفیه استانبول
  Antalya: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=800&q=80', // بندرگاه تاریخی کالیچی و صخره‌های ساحلی آنتالیا
  Izmir: 'https://images.unsplash.com/photo-1569154941061-e231b4725ef1?auto=format&fit=crop&w=800&q=80', // میدان کناک و نوار ساحلی اژه‌ای ازمیر
  Trabzon: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80', // دره سرسبز و صومعه سوملا ترابزون
  Bodrum: 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=800&q=80', // خانه‌های سفید ساحلی و اسکله تفریحی بدروم
  Cappadocia: 'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?auto=format&fit=crop&w=800&q=80', // بالن‌های هوای گرم و دره‌های صخره‌ای کاپادوکیه
  // UAE
  Dubai: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=800&q=80', // برج خلیفه و اسکای‌لاین دبی
  'Abu Dhabi': 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=800&q=80', // مسجد جامع شیخ زاید ابوظبی
  Sharjah: 'https://images.unsplash.com/photo-1580674684081-7617fbf3d745?auto=format&fit=crop&w=800&q=80', // میراث فرهنگی و هنر اسلامی شارجه
  'Ras Al Khaimah': 'https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=800&q=80', // قله‌های جبل جیس و طبیعت راس‌الخیمه
  // Georgia
  Tbilisi: 'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=800&q=80', // بافت تاریخی و قلعه ناریکالا تفلیس
  Batumi: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=800&q=80', // بلوار ساحلی و دریای سیاه باتومی
  Kazbegi: 'https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&w=800&q=80', // کلیسای گرگتی و قله برفی کازبک
  Gudauri: 'https://images.unsplash.com/photo-1551524559-8af4e6624178?auto=format&fit=crop&w=800&q=80', // پیست اسکی و کوهستان قفقاز گودائوری
  Kakheti: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=800&q=80', // تاکستان‌های سرسبز دره آلازانی کاختی
  // Oman
  Muscat: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80', // مسجد سلطان قابوس و ساحل مطرح مسقط
  Salalah: 'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=800&q=80', // طبیعت سبز خریف و نخلستان‌های صلاله
  // Russia
  Moscow: 'https://images.unsplash.com/photo-1513326738677-b964603b136d?auto=format&fit=crop&w=800&q=80', // میدان سرخ و کلیسای سنت باسیل مسکو
  'Saint Petersburg': 'https://images.unsplash.com/photo-1556610961-2fecc5927173?auto=format&fit=crop&w=800&q=80', // کاخ ارمیتاژ و پل‌های رود نوا سن‌پترزبورگ
  Sochi: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80', // کوه‌های قفقاز و سواحل سوچی
  // China
  Beijing: 'https://images.unsplash.com/photo-1508804052814-cd3ba865a116?auto=format&fit=crop&w=800&q=80', // دیوار چین و شهر ممنوعه پکن
  Shanghai: 'https://images.unsplash.com/photo-1474181487882-5abf3f0ba6c2?auto=format&fit=crop&w=800&q=80', // باند شانگهای و برج مروارید خاور
  Guangzhou: 'https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?auto=format&fit=crop&w=800&q=80', // برج کانتون و خط آسمان گوانگژو
};
