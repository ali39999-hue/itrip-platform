import { localizedMetadata } from '@/lib/page-metadata';

export const generateMetadata = localizedMetadata({
  title: {"fa":"ویزا | فیروزه","en":"Visa Services | Firuzo","ar":"خدمات التأشيرة | فيروزو","zh":"签证服务 | Firuzo","ru":"Визовые услуги | Firuzo"},
  description: {"fa":"اخذ ویزای توریستی کشورهای مقصد با پیگیری کامل پرونده.","en":"Tourist visas for destination countries with full application tracking.","ar":"تأشيرات سياحية للدول المستهدفة مع متابعة كاملة للملف.","zh":"目的地国家旅游签证办理，全程申请跟踪。","ru":"Туристические визы с полным сопровождением заявки."},
  path: '/visa',
});

export default function MetadataLayout({ children }: { children: React.ReactNode }) {
  return children;
}
