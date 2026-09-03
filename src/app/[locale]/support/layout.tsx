import { localizedMetadata } from '@/lib/page-metadata';

export const generateMetadata = localizedMetadata({
  title: {"fa":"پشتیبانی | فیروزه","en":"Support | Firuzo","ar":"الدعم | فيروزو","zh":"客户支持 | Firuzo","ru":"Поддержка | Firuzo"},
  description: {"fa":"پشتیبانی ۲۴ ساعته فیروزه؛ پاسخگوی همه سوالات سفر شما.","en":"Firuzo 24/7 support — here for every travel question.","ar":"دعم فيروزو على مدار الساعة للإجابة على كل أسئلة السفر.","zh":"Firuzo 24/7 全天候支持，解答您的所有旅行问题。","ru":"Поддержка Firuzo 24/7 ответит на любые вопросы о поездке."},
  path: '/support',
});

export default function MetadataLayout({ children }: { children: React.ReactNode }) {
  return children;
}
