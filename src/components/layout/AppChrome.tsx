'use client';

import { usePathname } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BottomNav } from '@/components/layout/BottomNav';
import { SosInterpreter } from '@/components/shared/SosInterpreter';

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';
  const isAdmin = pathname.includes('/admin');

  if (isAdmin) {
    return <main className="flex-1 min-h-screen bg-[#f4f8f8]">{children}</main>;
  }

  return (
    <>
      <Header />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
      <BottomNav />
      <SosInterpreter />
    </>
  );
}
