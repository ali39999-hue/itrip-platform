import { localizedMetadata } from '@/lib/page-metadata';

export const generateMetadata = localizedMetadata({
  title: {
    fa: 'کاوش و رزرو سفر | فیروزو',
    en: 'Explore & Book Travel | Firuzo',
    ar: 'استكشف واحجز السفر | فيروزو',
    zh: '探索与预订旅行 | Firuzo',
    ru: 'Обзор и бронирование | Firuzo',
  },
  description: {
    fa: 'جستجوی پرواز، هتل و تور به‌علاوه ویزا، بیمه، eSIM، ترانسفر و بقیه خدمات سفر در یک هاب.',
    en: 'Search flights, hotels and tours plus visa, insurance, eSIM, transfers and the rest of Firuzo services in one hub.',
    ar: 'ابحث عن الرحلات والفنادق والجولات مع التأشيرة والتأمين وeSIM والنقل في مركز واحد.',
    zh: '在同一入口搜索机票、酒店、旅游，以及签证、保险、eSIM 与接送等服务。',
    ru: 'Поиск авиабилетов, отелей и туров плюс виза, страховка, eSIM и трансферы в одном хабе.',
  },
  path: '/book',
});

export default function BookLayout({ children }: { children: React.ReactNode }) {
  return children;
}
