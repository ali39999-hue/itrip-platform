import type { Metadata, Viewport } from "next";
import { Vazirmatn, Geist_Mono } from "next/font/google";
import "../globals.css";
import {NextIntlClientProvider} from 'next-intl';
import {getMessages, setRequestLocale} from 'next-intl/server';
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

import { AppChrome } from '@/components/layout/AppChrome';
import { PwaBoot } from '@/components/pwa/PwaBoot';

export const metadata: Metadata = {
  title: {
    template: "%s | فیروزو (Firuzo)",
    default: "فیروزو (Firuzo) | پلتفرم جامع و هوشمند سفر",
  },
  description: "سامانه یکپارچه و هوشمند خدمات سفر، هتل، پرواز، ترانسفر، ویزا و کیف پول چندارزی فیروزو",
  manifest: "/manifest.json",
  icons: { 
    icon: "/images/logo.png",
    shortcut: "/images/logo.png",
    apple: "/images/logo.png" 
  },
};

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

  return (
    <html
      lang={locale}
      dir={dir}
      className={`${vazirmatn.variable} ${vazirmatnHeading.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-paper text-ink pb-[62px] md:pb-0">
        <NextIntlClientProvider messages={messages}>
          <Providers>
            <AppChrome>
              {children}
            </AppChrome>
          </Providers>
        </NextIntlClientProvider>
        <PwaBoot />
      </body>
    </html>
  );
}
