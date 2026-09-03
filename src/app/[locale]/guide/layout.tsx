import { localizedMetadata } from '@/lib/page-metadata';

export const generateMetadata = localizedMetadata({
  title: {"fa":"راهنمای سفر | فیروزه","en":"Travel Guide | Firuzo","ar":"دليل السفر | فيروزو","zh":"旅行指南 | Firuzo","ru":"Гид по путешествиям | Firuzo"},
  description: {"fa":"مقالات و راهنماهای کاربردی سفر؛ از ویزا تا بیمه و خرید بلیت.","en":"Practical travel guides and articles — from visas to insurance and ticket tips.","ar":"أدلة ومقالات سفر عملية — من التأشيرة إلى التأمين ونصائح التذاكر.","zh":"实用旅行指南与文章——涵盖签证、保险与购票技巧。","ru":"Практические путеводители и статьи — от виз до страховок и билетов."},
  path: '/guide',
});

export default function MetadataLayout({ children }: { children: React.ReactNode }) {
  return children;
}
