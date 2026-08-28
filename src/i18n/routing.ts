import {defineRouting} from 'next-intl/routing';
import {createNavigation} from 'next-intl/navigation';
 
export const routing = defineRouting({
  locales: ['en', 'fa', 'ar', 'zh', 'ru'],
  defaultLocale: 'fa'
});
 
export const {Link, redirect, usePathname, useRouter, getPathname} =
  createNavigation(routing);
