import { localizedMetadata } from '@/lib/page-metadata';

export const generateMetadata = localizedMetadata({
  title: {"fa":"بیمه مسافرتی | فیروزه","en":"Travel Insurance | Firuzo","ar":"تأمين السفر | فيروزو","zh":"旅行保险 | Firuzo","ru":"Туристическая страховка | Firuzo"},
  description: {"fa":"بیمه مسافرتی معتبر بین‌المللی با پوشش درمان و کنسلی سفر.","en":"Valid international travel insurance with medical and cancellation coverage.","ar":"تأمين سفر دولي معتمد بتغطية طبية وتغطية إلغاء الرحلة.","zh":"有效的国际旅行保险，涵盖医疗与行程取消。","ru":"Действующая международная страховка с медицинским покрытием и отменой поездки."},
  path: '/insurance',
});

export default function MetadataLayout({ children }: { children: React.ReactNode }) {
  return children;
}
