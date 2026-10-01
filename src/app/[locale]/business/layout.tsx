import { localizedMetadata } from '@/lib/page-metadata';
import '@/app/business.css';

export const generateMetadata = localizedMetadata({
  title: {
    fa: 'فیروزو بیزنس — تور فناوری و نمایشگاهی',
    en: 'Firuzo Business — Technology & Trade-Fair Tours',
    ar: 'فيروزو بيزنس — جولات التقنية والمعارض',
    zh: 'Firuzo 商务 — 科技与展会考察团',
    ru: 'Firuzo Business — технологические и выставочные туры',
  },
  description: {
    fa: 'سفر فناوری سازمان شما، در یک مسیر: از نمایشگاه و هیئت تجاری تا بازدید کارخانه و جلسات B2B؛ درخواست، هماهنگی، پرداخت و ووچر یکجا.',
    en: 'Your company’s technology travel in one track: trade fairs, factory visits, B2B meetings — request, coordination, payment and voucher in one place.',
    ar: 'رحلات شركتكم التقنية في مسار واحد: المعارض والزيارات الصناعية واجتماعات B2B — الطلب والتنسيق والدفع والقسيمة في مكان واحد.',
    zh: '企业科技出行一站式办理：展会、工厂参观与 B2B 会议；申请、协调、支付与凭证一体化。',
    ru: 'Деловые технологические поездки вашей компании в одном треке: выставки, посещение заводов, B2B-встречи — заявка, координация, оплата и ваучер в одном месте.',
  },
  path: '/business',
});

export default function BusinessLayout({ children }: { children: React.ReactNode }) {
  // پوسته بصری اختصاصی بیزنس — کلاس fz زمینه --fz-bg و جهت را می‌سازد.
  // هدر و فوتر سراسری سایت (AppChrome) حفظ می‌شود؛ BizHeader داخل صفحات است.
  return <div className="fz">{children}</div>;
}
