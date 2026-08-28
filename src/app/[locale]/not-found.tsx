import { Link } from '@/i18n/routing';
import { Compass, Home, Search } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center bg-surface border border-line rounded-3xl p-8 shadow-elev-2 space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-mint text-brand-dark grid place-items-center mx-auto">
          <Compass size={32} />
        </div>
        <div>
          <span className="text-4xl font-black text-brand-dark font-mono block mb-1">۴۰۴</span>
          <h2 className="text-xl font-black text-ink mb-2">صفحه مورد نظر یافت نشد</h2>
          <p className="text-xs text-sub leading-relaxed">
            آدرسی که وارد کرده‌اید وجود ندارد یا این صفحه به نشانی دیگری منتقل شده است.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            href="/"
            className="h-11 px-5 rounded-xl bg-brand text-surface font-bold text-xs hover:bg-brand-dark transition flex items-center gap-2"
          >
            <Home size={15} />
            <span>صفحه اصلی</span>
          </Link>
          <Link
            href="/hotels"
            className="h-11 px-5 rounded-xl bg-soft border border-line text-ink font-bold text-xs hover:bg-line/40 transition flex items-center gap-2"
          >
            <Search size={15} />
            <span>جستجوی اقامتگاه</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
