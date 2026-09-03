import { localizedMetadata } from '@/lib/page-metadata';

export const generateMetadata = localizedMetadata({
  title: {"fa":"سفرنامه‌ها | فیروزه","en":"Travelogues | Firuzo","ar":"رحلات مروية | فيروزو","zh":"旅行游记 | Firuzo","ru":"Путевые заметки | Firuzo"},
  description: {"fa":"تجربه‌های واقعی مسافران فیروزه از مقاصد مختلف.","en":"Real traveler stories from Firuzo destinations.","ar":"قصص حقيقية من مسافري فيروزو حول وجهات مختلفة.","zh":"Firuzo 旅行者的真实故事。","ru":"Реальные истории путешественников Firuzo."},
  path: '/travelogues',
});

export default function MetadataLayout({ children }: { children: React.ReactNode }) {
  return children;
}
