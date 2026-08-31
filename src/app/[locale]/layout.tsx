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
  variable: "--font-sans",
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
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
});

const notoSans = Noto_Sans({
  variable: "--font-sans",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "700", "900"],
});

const notoSansSC = Noto_Sans_SC({
  variable: "--font-sans",
  weight: ["400", "500", "700", "900"],
  preload: false,
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

import { AppChrome } from '@/components/layout/AppChrome';
import { PwaBoot } from '@/components/pwa/PwaBoot';

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
      icon: "/images/logo.png",
      shortcut: "/images/logo.png",
      apple: "/images/logo.png"
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
    >
      <body className="min-h-full flex flex-col bg-paper text-ink pb-[62px] md:pb-0">
        <NextIntlClientProvider messages={messages}>
          <Providers>
            <AppChrome>
              {children}
            </AppChrome>
          </Providers>
          <PwaBoot />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
