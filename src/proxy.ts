import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

/* همه مسیرها به‌جز api و فایل‌های استاتیک — تا دیپ‌لینک بدون پیشوند زبان
   (مثل /wallet یا /checkout) به‌جای 404 به /fa/wallet ریدایرکت شود */
export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
