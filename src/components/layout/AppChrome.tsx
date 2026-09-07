'use client';

import { usePathname } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { BottomNav } from '@/components/layout/BottomNav';
import { SosInterpreter } from '@/components/shared/SosInterpreter';
import { ToursPromoModal } from '@/components/tours/ToursPromoModal';
import { Toaster } from 'sonner';

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';
  const isAdmin = /^\/([a-z]{2}\/)?admin(\/|$)/.test(pathname);

  if (isAdmin) {
    return (
      <main className="flex-1 min-h-screen bg-soft">
        {children}
        <Toaster position="top-center" richColors closeButton />
      </main>
    );
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
      <ToursPromoModal />
      <Toaster position="top-center" richColors closeButton />
    </>
  );
}
