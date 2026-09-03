import type { Metadata, Viewport } from "next";
import {
  Vazirmatn,
  Geist_Mono,
  Plus_Jakarta_Sans,
  Noto_Sans,
  Noto_Sans_SC,
} from "next/font/google";
import "../globals.css";
import {NextIntlClientProvider} from 'next-intl';
import {getMessages, getTranslations, setRequestLocale} from 'next-intl/server';
import {routing} from '@/i18n/routing';
import {notFound} from 'next/navigation';
import {Providers} from '@/providers';

const vazirmatn = Vazirmatn({
  variable: "--font-vazirmatn",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700", "800", "900"],
});

const vazirmatnHeading = Vazirmatn({
  variable: "--font-heading-vazir",
  subsets: ["arabic", "latin"],
  weight: ["800", "900"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
});

const notoSans = Noto_Sans({
  variable: "--font-noto",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "700", "900"],
});

const notoSansSC = Noto_Sans_SC({
  variable: "--font-noto-sc",
  weight: ["400", "500", "700", "900"],
  preload: true,
});

const LOCALE_FONT: Record<string, { variable: string }> = {
  fa: vazirmatn,
  ar: vazirmatn,
  en: plusJakartaSans,
  ru: notoSans,
  zh: notoSansSC,
};

function localeFont(locale: string) {
  return LOCALE_FONT[locale] ?? vazirmatn;
}

// CSS variables consumed by the --font-sans / --font-heading tokens in globals.css.
const LOCALE_FONT_VAR: Record<string, { sans: string; heading: string }> = {
  fa: { sans: 'var(--font-vazirmatn)', heading: 'var(--font-heading-vazir)' },
  ar: { sans: 'var(--font-vazirmatn)', heading: 'var(--font-heading-vazir)' },
  en: { sans: 'var(--font-jakarta)', heading: 'var(--font-jakarta)' },
  ru: { sans: 'var(--font-noto)', heading: 'var(--font-noto)' },
  zh: { sans: 'var(--font-noto-sc)', heading: 'var(--font-noto-sc)' },
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
    title: {
      default: t('title'),
      template: `%s | ${brand('name')}`,
    },
    description: t('description'),
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
  themeColor: "#053f3e",
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
      className={`${font.variable} ${vazirmatnHeading.variable} ${geistMono.variable} h-full antialiased`}
      style={
        {
          '--font-app-sans': (LOCALE_FONT_VAR[locale] ?? LOCALE_FONT_VAR.fa).sans,
          '--font-app-heading': (LOCALE_FONT_VAR[locale] ?? LOCALE_FONT_VAR.fa).heading,
        } as React.CSSProperties
      }
    >
      <body className="min-h-full flex flex-col bg-paper text-ink pb-[62px] md:pb-0">
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
