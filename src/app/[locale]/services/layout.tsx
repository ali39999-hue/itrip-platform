import { localizedMetadata } from '@/lib/page-metadata';

export const generateMetadata = localizedMetadata({
  title: {"fa":"خدمات سفر | فیروزه","en":"Travel Services | Firuzo","ar":"خدمات السفر | فيروزو","zh":"旅行服务 | Firuzo","ru":"Услуги для путешествий | Firuzo"},
  description: {"fa":"همه خدمات سفر فیروزه: ویزا، بیمه، eSIM، مترجم همراه، ترانسفر، قطار وmore.","en":"All Firuzo travel services: visa, insurance, eSIM, interpreter, transfers, trains and more.","ar":"جميع خدمات السفر من فيروزو: تأشيرة وتأمين وeSIM ومترجم ونقل وقطارات والمزيد.","zh":"Firuzo 全部旅行服务：签证、保险、eSIM、随身翻译、接送、火车等。","ru":"Все услуги Firuzo: виза, страховка, eSIM, переводчик, трансферы, поезда и другое."},
  path: '/services',
});

export default function MetadataLayout({ children }: { children: React.ReactNode }) {
  return children;
}
