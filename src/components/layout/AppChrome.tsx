'use client';

import { usePathname } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BottomNav } from '@/components/layout/BottomNav';
import { SosInterpreter } from '@/components/shared/SosInterpreter';

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';
  const isAdmin = /^\/([a-z]{2}\/)?admin(\/|$)/.test(pathname);

  if (isAdmin) {
    return <main className="flex-1 min-h-screen bg-soft">{children}</main>;
  }

  return (
    <>
      <Header />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <Footer />
      <BottomNav />
      <SosInterpreter />
    </>
  );
}
