import type { Flight, Hotel, Tour, TransferOption, InsurancePlan } from './types';
import type { CountryId } from './countries';
import { DETAILED_TOURS } from '@/services/tours-service';

export interface CityOption {
  id: string;
  fa: string;
  en: string;
  nameFa: string;
  nameEn: string;
  airport: string;
  airportCode: string;
  airportNameFa: string;
  airportNameEn: string;
  country: string;
  countryCode: string;
  countryId: CountryId;
  flag: string;
  popular?: boolean;
}

export const CITIES: CityOption[] = [
  { id: 'thr', fa: 'تهران', en: 'Tehran', nameFa: 'تهران', nameEn: 'Tehran', airport: 'THR', airportCode: 'THR', airportNameFa: 'فرودگاه مهرآباد / امام خمینی', airportNameEn: 'Mehrabad & IKA Airports', country: 'IR', countryCode: 'IR', countryId: 'iran', flag: '🇮🇷', popular: true },
  { id: 'mhd', fa: 'مشهد', en: 'Mashhad', nameFa: 'مشهد', nameEn: 'Mashhad', airport: 'MHD', airportCode: 'MHD', airportNameFa: 'فرودگاه شهید هاشمی‌نژاد', airportNameEn: 'Shahid Hasheminejad Airport', country: 'IR', countryCode: 'IR', countryId: 'iran', flag: '🇮🇷', popular: true },
  { id: 'ifn', fa: 'اصفهان', en: 'Isfahan', nameFa: 'اصفهان', nameEn: 'Isfahan', airport: 'IFN', airportCode: 'IFN', airportNameFa: 'فرودگاه شهید بهشتی', airportNameEn: 'Shahid Beheshti Airport', country: 'IR', countryCode: 'IR', countryId: 'iran', flag: '🇮🇷', popular: true },
  { id: 'syz', fa: 'شیراز', en: 'Shiraz', nameFa: 'شیراز', nameEn: 'Shiraz', airport: 'SYZ', airportCode: 'SYZ', airportNameFa: 'فرودگاه بین‌المللی شهید دستغیب', airportNameEn: 'Shahid Dastgheib Airport', country: 'IR', countryCode: 'IR', countryId: 'iran', flag: '🇮🇷', popular: true },
  { id: 'kih', fa: 'کیش', en: 'Kish', nameFa: 'کیش', nameEn: 'Kish Island', airport: 'KIH', airportCode: 'KIH', airportNameFa: 'فرودگاه بین‌المللی کیش', airportNameEn: 'Kish International Airport', country: 'IR', countryCode: 'IR', countryId: 'iran', flag: '🇮🇷', popular: true },
  { id: 'tbz', fa: 'تبریز', en: 'Tabriz', nameFa: 'تبریز', nameEn: 'Tabriz', airport: 'TBZ', airportCode: 'TBZ', airportNameFa: 'فرودگاه بین‌المللی شهید مدنی', airportNameEn: 'Shahid Madani Airport', country: 'IR', countryCode: 'IR', countryId: 'iran', flag: '🇮🇷', popular: true },
  { id: 'awz', fa: 'اهواز', en: 'Ahvaz', nameFa: 'اهواز', nameEn: 'Ahvaz', airport: 'AWZ', airportCode: 'AWZ', airportNameFa: 'فرودگاه شهید قاسم سلیمانی', airportNameEn: 'Ahvaz International Airport', country: 'IR', countryCode: 'IR', countryId: 'iran', flag: '🇮🇷', popular: true },
  { id: 'azd', fa: 'یزد', en: 'Yazd', nameFa: 'یزد', nameEn: 'Yazd', airport: 'AZD', airportCode: 'AZD', airportNameFa: 'فرودگاه شهید صدوقی', airportNameEn: 'Yazd Airport', country: 'IR', countryCode: 'IR', countryId: 'iran', flag: '🇮🇷', popular: true },
  { id: 'bnd', fa: 'بندرعباس', en: 'Bandar Abbas', nameFa: 'بندرعباس', nameEn: 'Bandar Abbas', airport: 'BND', airportCode: 'BND', airportNameFa: 'فرودگاه بین‌المللی بندرعباس', airportNameEn: 'Bandar Abbas Airport', country: 'IR', countryCode: 'IR', countryId: 'iran', flag: '🇮🇷', popular: true },
  { id: 'gsm', fa: 'قشم', en: 'Qeshm', nameFa: 'قشم', nameEn: 'Qeshm Island', airport: 'GSM', airportCode: 'GSM', airportNameFa: 'فرودگاه بین‌المللی دیرستان قشم', airportNameEn: 'Qeshm Airport', country: 'IR', countryCode: 'IR', countryId: 'iran', flag: '🇮🇷', popular: true },
  { id: 'ker', fa: 'کرمان', en: 'Kerman', nameFa: 'کرمان', nameEn: 'Kerman', airport: 'KER', airportCode: 'KER', airportNameFa: 'فرودگاه بین‌المللی کرمان', airportNameEn: 'Kerman Airport', country: 'IR', countryCode: 'IR', countryId: 'iran', flag: '🇮🇷', popular: true },
  { id: 'ras', fa: 'رشت', en: 'Rasht', nameFa: 'رشت', nameEn: 'Rasht', airport: 'RAS', airportCode: 'RAS', airportNameFa: 'فرودگاه سردار جنگل', airportNameEn: 'Rasht Airport', country: 'IR', countryCode: 'IR', countryId: 'iran', flag: '🇮🇷', popular: true },
  { id: 'sry', fa: 'ساری', en: 'Sari', nameFa: 'ساری', nameEn: 'Sari', airport: 'SRY', airportCode: 'SRY', airportNameFa: 'فرودگاه بین‌المللی دشت ناز', airportNameEn: 'Sari Dasht Naz Airport', country: 'IR', countryCode: 'IR', countryId: 'iran', flag: '🇮🇷', popular: true },
  { id: 'ist', fa: 'استانبول', en: 'Istanbul', nameFa: 'استانبول', nameEn: 'Istanbul', airport: 'IST', airportCode: 'IST', airportNameFa: 'فرودگاه استانبول / صبیحه', airportNameEn: 'Istanbul (IST / SAW) Airports', country: 'TR', countryCode: 'TR', countryId: 'turkey', flag: '🇹🇷', popular: true },
  { id: 'dxb', fa: 'دبی', en: 'Dubai', nameFa: 'دبی', nameEn: 'Dubai', airport: 'DXB', airportCode: 'DXB', airportNameFa: 'فرودگاه بین‌المللی دبی', airportNameEn: 'Dubai International Airport', country: 'AE', countryCode: 'AE', countryId: 'uae', flag: '🇦🇪', popular: true },
  { id: 'tbs', fa: 'تفلیس', en: 'Tbilisi', nameFa: 'تفلیس', nameEn: 'Tbilisi', airport: 'TBS', airportCode: 'TBS', airportNameFa: 'فرودگاه بین‌المللی شوتا روستاولی', airportNameEn: 'Shota Rustaveli Airport', country: 'GE', countryCode: 'GE', countryId: 'georgia', flag: '🇬🇪', popular: true },
  { id: 'mow', fa: 'مسکو', en: 'Moscow', nameFa: 'مسکو', nameEn: 'Moscow', airport: 'SVO', airportCode: 'SVO', airportNameFa: 'فرودگاه شرمتیوو / ونوکووا', airportNameEn: 'Sheremetyevo & Vnukovo', country: 'RU', countryCode: 'RU', countryId: 'russia', flag: '🇷🇺', popular: true },
  { id: 'mct', fa: 'مسقط', en: 'Muscat', nameFa: 'مسقط', nameEn: 'Muscat', airport: 'MCT', airportCode: 'MCT', airportNameFa: 'فرودگاه بین‌المللی مسقط', airportNameEn: 'Muscat International Airport', country: 'OM', countryCode: 'OM', countryId: 'oman', flag: '🇴🇲', popular: true },
  { id: 'bjs', fa: 'پکن', en: 'Beijing', nameFa: 'پکن', nameEn: 'Beijing', airport: 'PEK', airportCode: 'PEK', airportNameFa: 'فرودگاه پکن کپیتال / داکسینگ', airportNameEn: 'Beijing Capital & Daxing Airports', country: 'CN', countryCode: 'CN', countryId: 'china', flag: '🇨🇳', popular: true },
];

export const FLIGHTS: Flight[] = [
  { id: 'f1', airline: 'ایران ایر', airlineEn: 'Iran Air', flightNo: 'IR-432', departureTime: '14:30', arrivalTime: '16:00', origin: 'تهران (THR)', destination: 'مشهد (MHD)', originCity: 'تهران', destinationCity: 'مشهد', duration: '1h 30m', price: 28500000, seatsLeft: 3, baggage: '20kg + 7kg', cabinClass: 'economy', stops: 0, ticketType: 'systemic', aircraft: 'Airbus A320' },
  { id: 'f2', airline: 'ماهان', airlineEn: 'Mahan Air', flightNo: 'W5-102', departureTime: '18:15', arrivalTime: '19:45', origin: 'تهران (THR)', destination: 'مشهد (MHD)', originCity: 'تهران', destinationCity: 'مشهد', duration: '1h 30m', price: 31000000, seatsLeft: 9, baggage: '25kg + 7kg', cabinClass: 'economy', stops: 0, ticketType: 'systemic', aircraft: 'Airbus A340' },
  { id: 'f3', airline: 'آسمان', airlineEn: 'Aseman', flightNo: 'EP-881', departureTime: '07:20', arrivalTime: '08:50', origin: 'تهران (THR)', destination: 'مشهد (MHD)', originCity: 'تهران', destinationCity: 'مشهد', duration: '1h 30m', price: 24800000, seatsLeft: 12, baggage: '20kg + 7kg', cabinClass: 'economy', stops: 0, ticketType: 'charter', aircraft: 'Boeing 737-400' },
  { id: 'f4', airline: 'ترکیش', airlineEn: 'Turkish Airlines', flightNo: 'TK-878', departureTime: '04:45', arrivalTime: '08:35', origin: 'تهران (THR)', destination: 'استانبول (IST)', originCity: 'تهران', destinationCity: 'استانبول', duration: '3h 50m', price: 96000000, seatsLeft: 5, baggage: '30kg + 8kg', cabinClass: 'economy', stops: 0, ticketType: 'systemic', aircraft: 'Airbus A321neo' },
  { id: 'f5', airline: 'امارات', airlineEn: 'Emirates', flightNo: 'EK-982', departureTime: '09:10', arrivalTime: '12:05', origin: 'تهران (THR)', destination: 'دبی (DXB)', originCity: 'تهران', destinationCity: 'دبی', duration: '2h 25m', price: 128000000, seatsLeft: 7, baggage: '30kg + 7kg', cabinClass: 'economy', stops: 0, ticketType: 'systemic', aircraft: 'Boeing 777-300ER' },
  { id: 'f6', airline: 'ماهان', airlineEn: 'Mahan Air', flightNo: 'W5-511', departureTime: '03:30', arrivalTime: '06:10', origin: 'تهران (THR)', destination: 'تفلیس (TBS)', originCity: 'تهران', destinationCity: 'تفلیس', duration: '2h 40m', price: 84500000, seatsLeft: 4, baggage: '25kg + 7kg', cabinClass: 'business', stops: 0, ticketType: 'systemic', aircraft: 'Airbus A310' },
  { id: 'f7', airline: 'آئروفلوت', airlineEn: 'Aeroflot', flightNo: 'SU-513', departureTime: '07:05', arrivalTime: '10:20', origin: 'تهران (THR)', destination: 'مسکو (SVO)', originCity: 'تهران', destinationCity: 'مسکو', duration: '3h 45m', price: 112000000, seatsLeft: 8, baggage: '23kg + 10kg', cabinClass: 'economy', stops: 0, ticketType: 'systemic', aircraft: 'Airbus A320' },
  { id: 'f8', airline: 'عمان ایر', airlineEn: 'Oman Air', flightNo: 'WY-154', departureTime: '05:20', arrivalTime: '08:40', origin: 'تهران (THR)', destination: 'مسقط (MCT)', originCity: 'تهران', destinationCity: 'مسقط', duration: '2h 50m', price: 96000000, seatsLeft: 6, baggage: '30kg + 7kg', cabinClass: 'economy', stops: 0, ticketType: 'systemic', aircraft: 'Boeing 737 MAX 8' },
];

export const HOTELS: Hotel[] = [
  {
    id: 'h1', name: 'هتل درویشی مشهد', nameEn: 'Darvishi Royal Hotel Mashhad', city: 'مشهد', cityEn: 'Mashhad',
    stars: 5, rating: 8.9, reviewsCount: 1243, pricePerNight: 42000000, imageQuery: 'luxury-hotel',
    heroImage: 'https://www.eghamat24.com/app/public/hotel_images/original/Mashhad-Darvishi-44.jpg',
    galleryImages: [
      'https://www.eghamat24.com/app/public/hotel_images/original/Mashhad-Darvishi-44.jpg',
      'https://www.eghamat24.com/app/public/hotel_images/original/Mashhad-Darvishi-90.jpg',
      'https://www.eghamat24.com/app/public/hotel_images/original/Mashhad-Darvishi-82.jpg',
      'https://www.eghamat24.com/app/public/hotel_images/original/Mashhad-Darvishi-80.jpg',
      'https://www.eghamat24.com/app/public/hotel_images/original/Mashhad-Darvishi-06.jpg',
    ],
    address: 'مشهد، خیابان امام رضا، بین امام رضا ۲۴ و ۲۶',
    description: 'تنها هتل آتریوم شرق کشور با ۲۰ طبقه مجلل، سوئیت‌های پنت‌هاوس و رویال، استخر و اسپای اختصاصی و فاصله کوتاه تا بارگاه منور رضوی.',
    amenities: ['wifi', 'pool', 'spa', 'restaurant', 'parking', 'shuttle'],
    distanceFromCenter: '۵۰۰ متر تا حرم', freeCancellation: true,
    roomTypes: [
      { id: 'r1', name: 'اتاق دبل استاندارد', capacity: 2, breakfast: true, pricePerNight: 42000000, available: 6 },
      { id: 'r2', name: 'سوییت دو نفره', capacity: 2, breakfast: true, pricePerNight: 68000000, available: 3 },
      { id: 'r3', name: 'اتاق تریپل', capacity: 3, breakfast: true, pricePerNight: 55000000, available: 4 },
    ],
  },
  {
    id: 'h2', name: 'هتل عباسی اصفهان', nameEn: 'Abbasi Hotel Isfahan', city: 'اصفهان', cityEn: 'Isfahan',
    stars: 5, rating: 9.1, reviewsCount: 2109, pricePerNight: 38000000, imageQuery: 'historic-hotel',
    heroImage: 'https://www.eghamat24.com/app/public/hotel_images/original/Esfahan-Abbasi-31.jpg',
    galleryImages: [
      'https://www.eghamat24.com/app/public/hotel_images/original/Esfahan-Abbasi-31.jpg',
      'https://www.eghamat24.com/app/public/hotel_images/original/Esfahan-Abbasi-48.jpg',
      '/images/isfahan/ali-qapu.jpg',
      '/images/isfahan/sheikh-lotfollah-exterior.jpg',
      '/images/isfahan/sheikh-lotfollah.jpg',
      '/images/isfahan/khaju-bridge.jpg',
      '/images/isfahan/khaju-pavilion.jpg',
      '/images/isfahan/khaju-day.jpg',
      '/images/isfahan/chehel-sotoun.jpg',
      '/images/isfahan/menar-jonban.jpg',
      '/images/isfahan/shah-mosque.jpg',
      '/images/isfahan/jameh-mosque.jpg',
      '/images/isfahan/bazaar-handicrafts.jpg',
    ],
    address: 'اصفهان، خیابان چهارباغ عباسی، خیابان آمادگاه',
    description: 'کهن‌ترین مهمانسرای جهان با معماری بی‌بدیل صفوی، حیاط و باغ ایرانی رویایی، چایخانه سنتی و اتاق‌های پردیس مشرف به فضای سبز تاریخی.',
    amenities: ['wifi', 'restaurant', 'garden', 'museum', 'teahouse'],
    distanceFromCenter: '۱ کیلومتر تا میدان نقش جهان', freeCancellation: false,
    roomTypes: [
      { id: 'r1', name: 'اتاق دبل سنتی', capacity: 2, breakfast: true, pricePerNight: 38000000, available: 8 },
      { id: 'r2', name: 'اتاق سینگل', capacity: 1, breakfast: true, pricePerNight: 26000000, available: 5 },
    ],
  },
  {
    id: 'h3', name: 'رزیدانس دبی مارینا', nameEn: 'Dubai Marina Residence', city: 'دبی', cityEn: 'Dubai',
    stars: 4, rating: 8.4, reviewsCount: 867, pricePerNight: 152000000, imageQuery: 'modern-apartment',
    heroImage: 'https://images.unsplash.com/photo-1580674684081-7617fbf3d745?auto=format&fit=crop&w=1200&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1580674684081-7617fbf3d745?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1200&q=80',
    ],
    address: 'دبی، مارینا، خیابان الممشى، نزدیک به ساحل JBR',
    description: 'آپارتمان‌های لوکس با چشم‌انداز رویایی کانال مارینا، استخر بی‌نهایت در پشت‌بام، سالن بدنسازی مجهز و دسترسی پیاده به ساحل جی‌بی‌آر.',
    amenities: ['wifi', 'pool', 'gym', 'beach_access'],
    distanceFromCenter: '۳۰۰ متر از ساحل جبرعلی', freeCancellation: true,
    roomTypes: [
      { id: 'r1', name: 'استودیو سی ویو', capacity: 2, breakfast: false, pricePerNight: 152000000, available: 4 },
      { id: 'r2', name: 'آپارتمان یک‌خوابه', capacity: 4, breakfast: false, pricePerNight: 240000000, available: 2 },
    ],
  },
  {
    id: 'h4', name: 'بوتیک هتل تفلیس', nameEn: 'Tbilisi Old Town Boutique', city: 'تفلیس', cityEn: 'Tbilisi',
    stars: 4, rating: 8.9, reviewsCount: 654, pricePerNight: 68000000, imageQuery: 'boutique-hotel',
    heroImage: 'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=1200&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
    ],
    address: 'تفلیس، بخش تاریخی کالا، خیابان شاردنی',
    description: 'بوتیک هتل شیک در قلب بافت تاریخی تفلیس با بالکن‌های حکاکی‌شده چوبی گرجی، تراس پانوراما رو به قلعه ناریکالا و صبحانه بوفه سنتی.',
    amenities: ['wifi', 'breakfast', 'terrace', 'bar'],
    distanceFromCenter: 'قلب شهر قدیم', freeCancellation: true,
    roomTypes: [
      { id: 'r1', name: 'اتاق دبل کلاسیک', capacity: 2, breakfast: true, pricePerNight: 68000000, available: 5 },
    ],
  },
  {
    id: 'h5', name: 'هتل طلاییه استانبول', nameEn: 'Golden Horn Hotel Istanbul', city: 'استانبول', cityEn: 'Istanbul',
    stars: 4, rating: 8.6, reviewsCount: 1531, pricePerNight: 74000000, imageQuery: 'istanbul-hotel',
    heroImage: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=1200&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?auto=format&fit=crop&w=1200&q=80',
    ],
    address: 'استانبول، بی‌اوغلو، نزدیکی میدان تاکسیم و خیابان استقلال',
    description: 'اقامت در موقعیتی ممتاز با دسترسی مستقیم به میدان تاکسیم و مترو، تراس با چشم‌انداز خیره‌کننده شاخ طلایی و تنگه بسفر و اسپا با حمام ترکی.',
    amenities: ['wifi', 'spa', 'restaurant', 'terrace'],
    distanceFromCenter: '۵۰۰ متر تا تاکسیم', freeCancellation: true,
    roomTypes: [
      { id: 'r1', name: 'اتاق دبل شهر', capacity: 2, breakfast: true, pricePerNight: 74000000, available: 7 },
      { id: 'r2', name: 'اتاق تریپل', capacity: 3, breakfast: true, pricePerNight: 92000000, available: 3 },
    ],
  },
  {
    id: 'h6', name: 'هتل متروپول مسکو', nameEn: 'Metropol Hotel Moscow', city: 'مسکو', cityEn: 'Moscow',
    stars: 5, rating: 9.0, reviewsCount: 987, pricePerNight: 135000000, imageQuery: 'moscow-hotel',
    heroImage: 'https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?auto=format&fit=crop&w=1200&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1513622470522-26c3c8a854bc?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1513326738677-b964603b136d?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=1200&q=80',
    ],
    address: 'مسکو، میدان تئاتر، روبروی تئاتر بولشوی و ۳۰۰ متری میدان سرخ',
    description: 'هتل افسانه‌ای و تاریخی روسیه با شکوه معماری آرت‌نوو، نقاشی‌های گنبدی باشکوه و رستوران مجلل در چند قدمی کرملین و میدان سرخ.',
    amenities: ['wifi', 'restaurant', 'spa', 'gym'],
    distanceFromCenter: '۲۰۰ متر تا میدان سرخ', freeCancellation: false,
    roomTypes: [
      { id: 'r1', name: 'اتاق کلاسیک', capacity: 2, breakfast: true, pricePerNight: 135000000, available: 4 },
    ],
  },
  {
    id: 'h7', name: 'رزورت ساحلی مسقط', nameEn: 'Muscat Beach Resort', city: 'مسقط', cityEn: 'Muscat',
    stars: 5, rating: 8.8, reviewsCount: 742, pricePerNight: 118000000, imageQuery: 'muscat-resort',
    heroImage: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
    ],
    address: 'مسقط، منطقه شاطئ القرم، مشرف به خلیج عمان',
    description: 'ریزورت ۵ ستاره ساحلی با نخلستان اختصاصی، دسترسی مستقیم به ماسه‌های طلایی دریای عمان و مرکز اسپا و ورزش‌های آبی مدرن.',
    amenities: ['wifi', 'pool', 'beach_access', 'restaurant', 'spa'],
    distanceFromCenter: 'ساحل القرم', freeCancellation: true,
    roomTypes: [
      { id: 'r1', name: 'اتاق دبل اقیانوس', capacity: 2, breakfast: true, pricePerNight: 118000000, available: 5 },
      { id: 'r2', name: 'سوییت فامیلی', capacity: 4, breakfast: true, pricePerNight: 186000000, available: 2 },
    ],
  },
  {
    id: 'h8', name: 'هتل بزرگ شیراز', nameEn: 'Shiraz Grand Hotel', city: 'شیراز', cityEn: 'Shiraz',
    stars: 5, rating: 9.0, reviewsCount: 1420, pricePerNight: 48000000, imageQuery: 'grand-hotel',
    heroImage: 'https://www.eghamat24.com/app/public/hotel_images/original/Shiraz-Shiraz-08.jpg',
    galleryImages: [
      'https://www.eghamat24.com/app/public/hotel_images/original/Shiraz-Shiraz-08.jpg',
      'https://www.eghamat24.com/app/public/hotel_images/original/Shiraz-Shiraz-26.jpg',
      'https://www.eghamat24.com/app/public/hotel_images/original/Shiraz-Bozorg-79.jpg',
      'https://www.eghamat24.com/app/public/hotel_images/original/Shiraz-Bozorg-78.jpg',
      'https://www.eghamat24.com/app/public/hotel_images/original/Shiraz-Bozorg-101.jpg',
    ],
    address: 'شیراز، ورودی شهر، در جوار دروازه قرآن',
    description: 'هتل باشکوه با معماری منحصر‌به‌فرد بر فراز صخره‌های دروازه قرآن با رستوران گردان و چشم‌انداز سراسری به شهر ادب و شعر.',
    amenities: ['wifi', 'pool', 'spa', 'restaurant', 'parking', 'gym'],
    distanceFromCenter: 'کنار دروازه قرآن', freeCancellation: true,
    roomTypes: [
      { id: 'r1', name: 'اتاق دبل مشرف به شهر', capacity: 2, breakfast: true, pricePerNight: 48000000, available: 6 },
      { id: 'r2', name: 'سوییت رویال', capacity: 3, breakfast: true, pricePerNight: 78000000, available: 2 },
    ],
  },
  {
    id: 'h9', name: 'هتل دریایی ترنج کیش', nameEn: 'Toranj Marine Resort Kish', city: 'کیش', cityEn: 'Kish',
    stars: 5, rating: 9.3, reviewsCount: 1850, pricePerNight: 88000000, imageQuery: 'toranj-resort',
    heroImage: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
    ],
    address: 'جزیره کیش، میدان جاسک، جاده جهان',
    description: 'نخستین هتل دریایی خاورمیانه با سوئیت‌های چوبی احداث‌شده بر روی پهنه آب‌های زلال خلیج فارس، کف شیشه‌ای جهت تماشای دنیای زیر آب و ترانسفر VIP.',
    amenities: ['wifi', 'pool', 'beach_access', 'restaurant', 'spa', 'shuttle'],
    distanceFromCenter: 'بر روی آب‌های ساحل غربی کیش', freeCancellation: true,
    roomTypes: [
      { id: 'r1', name: 'سوئیت رو به غروب دریایی', capacity: 2, breakfast: true, pricePerNight: 88000000, available: 4 },
      { id: 'r2', name: 'سوئیت امپریال رویال', capacity: 4, breakfast: true, pricePerNight: 165000000, available: 1 },
    ],
  },
  {
    id: 'h10', name: 'هتل صخره‌ای لاله کندوان', nameEn: 'Laleh Kandovan Rock Hotel', city: 'تبریز', cityEn: 'Tabriz',
    stars: 5, rating: 8.9, reviewsCount: 680, pricePerNight: 39000000, imageQuery: 'kandovan-cave',
    heroImage: 'https://www.eghamat24.com/app/public/hotel_images/original/Tabriz-Laleh-29.jpg',
    galleryImages: [
      'https://www.eghamat24.com/app/public/hotel_images/original/Tabriz-Laleh-29.jpg',
      'https://www.eghamat24.com/app/public/hotel_images/original/Tabriz-Laleh-07.jpg',
      'https://www.eghamat24.com/app/public/hotel_images/original/Tabriz-Laleh-48.jpg',
      'https://www.eghamat24.com/app/public/hotel_images/original/Tabriz-Laleh-23.jpg',
      'https://www.eghamat24.com/app/public/hotel_images/original/Tabriz-Laleh-32.jpg',
    ],
    address: 'آذربایجان شرقی، اسکو، دهکده توریستی تاریخی کندوان',
    description: 'سومین هتل صخره‌ای جهان با اتاق‌های مخروطی کله‌قندی حفر شده در دل صخره‌های طبیعی کوه سهند با جکوزی آب‌معدنی طبیعی و هوای کوهستانی بی‌نظیر.',
    amenities: ['wifi', 'restaurant', 'spa', 'parking'],
    distanceFromCenter: 'در قلب روستای تاریخی کندوان', freeCancellation: true,
    roomTypes: [
      { id: 'r1', name: 'اتاق دبل صخره‌ای کله‌قندی', capacity: 2, breakfast: true, pricePerNight: 39000000, available: 5 },
      { id: 'r2', name: 'سوئیت رویال جکوزی‌دار', capacity: 3, breakfast: true, pricePerNight: 64000000, available: 2 },
    ],
  },
];

export const TOURS: Tour[] = DETAILED_TOURS;

export const TRANSFERS: TransferOption[] = [
  { id: 'tr1', vehicleType: 'سانروف ساینا', vehicleTypeEn: 'Saipa Saina Sunroof', from: 'فرودگاه امام خمینی', fromEn: 'Imam Khomeini Airport (IKA)', to: 'مرکز تهران', toEn: 'Tehran City Center', price: 3200000, capacity: 4, luggage: 3, durationMinutes: 75 },
  { id: 'tr2', vehicleType: 'ون هیوندای ستاریا', vehicleTypeEn: 'Hyundai Staria Van', from: 'فرودگاه مشهد', fromEn: 'Mashhad Airport (MHD)', to: 'حرم مطهر', toEn: 'Holy Shrine', price: 4500000, capacity: 7, luggage: 6, durationMinutes: 40 },
  { id: 'tr3', vehicleType: 'مرسدس E-Class (VIP)', vehicleTypeEn: 'Mercedes E-Class VIP', from: 'فرودگاه استانبول IST', fromEn: 'Istanbul Airport (IST)', to: 'تاکسیم', toEn: 'Taksim Square', price: 12500000, capacity: 3, luggage: 3, durationMinutes: 55 },
  { id: 'tr4', vehicleType: 'تویوتا هایس', vehicleTypeEn: 'Toyota Hiace', from: 'فرودگاه دبی DXB', fromEn: 'Dubai Airport (DXB)', to: 'مارینا', toEn: 'Dubai Marina', price: 18000000, capacity: 10, luggage: 10, durationMinutes: 35 },
  { id: 'tr5', vehicleType: 'مرسدس V-Class', vehicleTypeEn: 'Mercedes V-Class', from: 'فرودگاه مسکو SVO', fromEn: 'Moscow Airport (SVO)', to: 'میدان سرخ', toEn: 'Red Square', price: 21000000, capacity: 5, luggage: 5, durationMinutes: 50 },
  { id: 'tr6', vehicleType: 'تویوتا لندکروز ۴×۴', vehicleTypeEn: 'Toyota Land Cruiser 4×4', from: 'فرودگاه مسقط MCT', fromEn: 'Muscat Airport (MCT)', to: 'مسقط قدیم', toEn: 'Old Muscat', price: 14500000, capacity: 4, luggage: 4, durationMinutes: 30 },
  { id: 'tr7', vehicleType: 'ون مرسدس', vehicleTypeEn: 'Mercedes Van', from: 'فرودگاه تفلیس TBS', fromEn: 'Tbilisi Airport (TBS)', to: 'شهر قدیم', toEn: 'Old Town', price: 8500000, capacity: 6, luggage: 5, durationMinutes: 35 },
];

export const VISA_SERVICES = [
  { id: 'v-tr', countryFa: 'ترکیه', countryEn: 'Turkey', processingDays: 5, price: 48000000, type: 'توریستی', typeEn: 'Tourist', approvalRate: 96 },
  { id: 'v-ae', countryFa: 'امارات', countryEn: 'UAE', processingDays: 3, price: 65000000, type: 'توریستی', typeEn: 'Tourist', approvalRate: 98 },
  { id: 'v-ge', countryFa: 'گرجستان', countryEn: 'Georgia', processingDays: 7, price: 35000000, type: 'توریستی', typeEn: 'Tourist', approvalRate: 94 },
  { id: 'v-ru', countryFa: 'روسیه', countryEn: 'Russia', processingDays: 10, price: 72000000, type: 'توریستی', typeEn: 'Tourist', approvalRate: 91 },
];

export const ESIM_PACKAGES = [
  { id: 'e1', country: 'ترکیه', countryEn: 'Turkey', countryFa: 'ترکیه', dataGb: 10, validityDays: 15, price: 2800000 },
  { id: 'e2', country: 'امارات', countryEn: 'UAE', countryFa: 'امارات', dataGb: 20, validityDays: 30, price: 4900000 },
  { id: 'e3', country: 'اروپا (۳۹ کشور)', countryEn: 'Europe (39 Countries)', countryFa: 'اروپا (۳۹ کشور)', dataGb: 15, validityDays: 21, price: 5500000 },
  { id: 'e4', country: 'گرجستان', countryEn: 'Georgia', countryFa: 'گرجستان', dataGb: 8, validityDays: 14, price: 2200000 },
  { id: 'e5', country: 'روسیه', countryEn: 'Russia', countryFa: 'روسیه', dataGb: 10, validityDays: 15, price: 3900000 },
  { id: 'e6', country: 'عمان', countryEn: 'Oman', countryFa: 'عمان', dataGb: 8, validityDays: 14, price: 2600000 },
];

export const INSURANCE_PLANS: InsurancePlan[] = [
  { 
    id: 'i1', 
    name: 'استاندارد', 
    nameEn: 'Standard',
    type: 'standard',
    subtitle: 'مناسب برای سفرهای کوتاه',
    subtitleEn: 'Ideal for short vacations',
    price: 350000, 
    priceLabel: 'پایه',
    coverageEur: 10000, 
    features: [
      { text: 'پوشش هزینه‌های پزشکی تا ۱۰,۰۰۰ یورو', textEn: 'Medical expenses cover up to €10,000', included: true },
      { text: 'جبران خسارت تاخیر پرواز', textEn: 'Flight delay compensation', included: true },
      { text: 'مفقود شدن بار', textEn: 'Lost baggage compensation', included: false },
    ]
  },
  { 
    id: 'i2', 
    name: 'طلایی', 
    nameEn: 'Golden Schengen',
    type: 'premium',
    subtitle: 'پوشش کامل و آرامش مطلق',
    subtitleEn: 'Full Schengen & embassy compliance',
    price: 780000, 
    priceLabel: 'پایه',
    coverageEur: 50000, 
    features: [
      { text: 'پوشش هزینه‌های پزشکی تا ۵۰,۰۰۰ یورو', textEn: 'Medical expenses cover up to €50,000', included: true },
      { text: 'جبران خسارت تاخیر پرواز', textEn: 'Flight delay compensation', included: true },
      { text: 'مفقود شدن بار کامل', textEn: 'Comprehensive lost baggage cover', included: true },
      { text: 'بازگشت پیش از موعد', textEn: 'Emergency trip return cover', included: true },
    ]
  },
  { 
    id: 'i3', 
    name: 'خانواده', 
    nameEn: 'Family & VIP',
    type: 'family',
    subtitle: 'اقتصادی برای سفرهای گروهی',
    subtitleEn: 'Full multi-traveler protection',
    price: 1200000, 
    priceLabel: 'خانواده ۴ نفره',
    coverageEur: 30000, 
    features: [
      { text: 'پوشش هزینه‌های پزشکی تا ۳۰,۰۰۰ یورو (هر نفر)', textEn: 'Medical expenses cover up to €30,000 per person', included: true },
      { text: 'جبران خسارت تاخیر پرواز', textEn: 'Flight delay compensation', included: true },
      { text: 'پوشش‌های ویژه کودکان', textEn: 'Special children assistance & care', included: true },
    ]
  },
];

export function formatIRR(amount: number): string {
  return amount.toLocaleString('fa-IR');
}

export { resolveCityQuery, localizedAirportLabel } from './cities';

/* نگاشت مقصد → داده‌های پایه برای پیشنهادساز هوشمند */
export const PLANNER_MAP: Record<CountryId, {
  flightCity: string;
  hotelId: string;
  transferId: string;
  esimCountry: string | null;
}> = {
  iran: { flightCity: 'مشهد', hotelId: 'h1', transferId: 'tr1', esimCountry: null },
  turkey: { flightCity: 'استانبول', hotelId: 'h5', transferId: 'tr3', esimCountry: 'ترکیه' },
  uae: { flightCity: 'دبی', hotelId: 'h3', transferId: 'tr4', esimCountry: 'امارات' },
  georgia: { flightCity: 'تفلیس', hotelId: 'h4', transferId: 'tr7', esimCountry: 'گرجستان' },
  russia: { flightCity: 'مسکو', hotelId: 'h6', transferId: 'tr5', esimCountry: 'روسیه' },
  oman: { flightCity: 'مسقط', hotelId: 'h7', transferId: 'tr6', esimCountry: 'عمان' },
  china: { flightCity: 'پکن', hotelId: 'h1', transferId: 'tr1', esimCountry: 'چین' },
};
