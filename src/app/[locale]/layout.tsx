import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "../globals.css";
import {NextIntlClientProvider} from 'next-intl';
import {getMessages, getTranslations, setRequestLocale} from 'next-intl/server';
import {routing} from '@/i18n/routing';
import {notFound} from 'next/navigation';
import {Providers} from '@/providers';

const iranYekan = localFont({
  src: [
    {
      path: "../../../public/fonts/iranyekan/IRANYekanXFaNum-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../../public/fonts/iranyekan/IRANYekanXFaNum-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../../public/fonts/iranyekan/IRANYekanXFaNum-DemiBold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../../public/fonts/iranyekan/IRANYekanXFaNum-Bold.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../../../public/fonts/iranyekan/IRANYekanXFaNum-Bold.woff2",
      weight: "800",
      style: "normal",
    },
    {
      path: "../../../public/fonts/iranyekan/IRANYekanXFaNum-Bold.woff2",
      weight: "900",
      style: "normal",
    },
  ],
  variable: "--font-iranyekan",
  display: "swap",
});

const yekanBakh = localFont({
  src: [
    {
      path: "../../../public/fonts/yekan-bakh/YekanBakh-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../../public/fonts/yekan-bakh/YekanBakh-SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../../public/fonts/yekan-bakh/YekanBakh-Bold.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../../../public/fonts/yekan-bakh/YekanBakh-ExtraBold.woff2",
      weight: "800",
      style: "normal",
    },
    {
      path: "../../../public/fonts/yekan-bakh/YekanBakh-Black.woff2",
      weight: "900",
      style: "normal",
    },
    {
      path: "../../../public/fonts/yekan-bakh/YekanBakh-ExtraBlack.woff2",
      weight: "950",
      style: "normal",
    },
  ],
  variable: "--font-yekan-bakh",
  display: "swap",
});

const geistMono = localFont({
  src: "../../../public/fonts/geist/GeistMono-Variable.woff2",
  variable: "--font-geist-mono",
  display: "swap",
  weight: "100 900",
});

const LOCALE_FONT: Record<string, { variable: string }> = {
  fa: iranYekan,
  ar: iranYekan,
  en: iranYekan,
  ru: iranYekan,
  zh: iranYekan,
};

function localeFont(locale: string) {
  return LOCALE_FONT[locale] ?? iranYekan;
}

// CSS variables consumed by the --font-sans / --font-heading tokens in globals.css.
// FlyToday exact font stack: IRANYekanXFaNum as primary font
const LOCALE_FONT_VAR: Record<string, { sans: string; heading: string }> = {
  fa: {
    sans: 'var(--font-iranyekan), IRANYekanXFaNum, IRANYekanX, var(--font-yekan-bakh), "Yekan Bakh", sans-serif',
    heading: 'var(--font-iranyekan), IRANYekanXFaNum, IRANYekanX, var(--font-yekan-bakh), "Yekan Bakh", sans-serif'
  },
  ar: {
    sans: 'var(--font-iranyekan), IRANYekanXFaNum, IRANYekanX, var(--font-yekan-bakh), "Yekan Bakh", "Segoe UI", Tahoma, sans-serif',
    heading: 'var(--font-iranyekan), IRANYekanXFaNum, IRANYekanX, var(--font-yekan-bakh), "Yekan Bakh", "Segoe UI", Tahoma, sans-serif'
  },
  en: {
    sans: 'var(--font-jakarta, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif)',
    heading: 'var(--font-jakarta, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif)'
  },
  ru: {
    sans: 'var(--font-noto, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif)',
    heading: 'var(--font-noto, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif)'
  },
  zh: {
    sans: 'var(--font-noto-sc, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", ui-sans-serif, system-ui, sans-serif)',
    heading: 'var(--font-noto-sc, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", ui-sans-serif, system-ui, sans-serif)'
  },
};

import { AppChrome } from '@/components/layout/AppChrome';
import { PwaBoot } from '@/components/pwa/PwaBoot';
import { Analytics } from '@vercel/analytics/next';
import Script from 'next/script';
import { lt } from '@/lib/lt';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = routing.locales.includes(rawLocale as (typeof routing.locales)[number])
    ? rawLocale
    : routing.defaultLocale;

  const t = await getTranslations({ locale, namespace: 'Metadata' });
  const brand = await getTranslations({ locale, namespace: 'Logo' });

  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
    title: {
      default: t('title'),
      template: `%s | ${brand('name')}`,
    },
    description: t('description'),
    alternates: {
      canonical: `/${locale}`,
      languages: {
        fa: '/fa',
        en: '/en',
        ar: '/ar',
        zh: '/zh',
        ru: '/ru',
      },
    },
    manifest: "/manifest.json",
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "any" },
        { url: "/icons/icon-32.png", sizes: "32x32", type: "image/png" },
        { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      ],
      shortcut: "/favicon.ico",
      apple: "/icons/apple-touch-icon.png",
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#00a9a5",
};

export default async function RootLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{locale: string}>;
}) {
  const {locale} = await params;

  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();
  const dir = ['fa', 'ar'].includes(locale) ? 'rtl' : 'ltr';
  const font = localeFont(locale);

  return (
    <html
      lang={locale}
      dir={dir}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${font.variable} ${iranYekan.variable} ${yekanBakh.variable} ${geistMono.variable} h-full antialiased`}
      style={
        {
          '--font-app-sans': (LOCALE_FONT_VAR[locale] ?? LOCALE_FONT_VAR.fa).sans,
          '--font-app-heading': (LOCALE_FONT_VAR[locale] ?? LOCALE_FONT_VAR.fa).heading,
        } as React.CSSProperties
      }
    >
      <head>
        {/* اعمال تم قبل از اولین رنگ‌آمیزی — بدون فلش. انتخاب کاربر مقدم بر تنظیم سیستم است. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('firuzo-theme');var m=window.matchMedia('(prefers-color-scheme: dark)').matches;var d=t==='dark'||(!t||t==='system')&&m;if(d)document.documentElement.classList.add('dark');}catch(e){}})();`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'TravelAgency',
              name: 'Firuzo',
              alternateName: 'فیروزو',
              url: 'https://firuzo.com',
              logo: 'https://firuzo.com/logo.png',
              description: 'پلتفرم جامع رزرواسیون آنلاین پرواز، هتل و خدمات سفر',
              priceRange: '$$',
              address: {
                '@type': 'PostalAddress',
                addressCountry: 'IR',
              },
            }),
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-paper text-ink pb-[calc(68px+env(safe-area-inset-bottom,0px))] lg:pb-0 overflow-x-clip">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:start-4 focus:z-[999] focus:px-4 focus:py-2.5 focus:bg-brand focus:text-surface focus:rounded-xl focus:font-black focus:shadow-elev-3 focus:outline-none"
        >
          {lt(locale, {
            fa: 'پرش به محتوای اصلی',
            en: 'Skip to main content',
            ar: 'الانتقال إلى المحتوى الرئيسي',
            zh: '跳至主要内容',
            ru: 'Перейти к основному содержимому',
          })}
        </a>
        <NextIntlClientProvider messages={messages}>
          <Providers>
            <AppChrome>
              {children}
            </AppChrome>
          </Providers>
          <PwaBoot />
        </NextIntlClientProvider>
        <Analytics />
        {process.env.NEXT_PUBLIC_GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');
              `}
            </Script>
          </>
        )}
        {/* اسکریپت مرکز تماس هوشمند فیروزو - فقط در زبان فارسی تا در سایر زبان‌ها متن فارسی تزریق نشود */}
        {locale === 'fa' && (
          <Script
            src="https://call.firuzo.online/widget.js"
            strategy="lazyOnload"
          />
        )}
      </body>
    </html>
  );
}
