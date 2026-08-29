'use client';

import Image from 'next/image';
import { Link } from '@/i18n/routing';

const MOCK_TRAVELOGUES = [
  {
    id: '1',
    title: 'سفر سه روزه به استانبول',
    destination: 'استانبول، ترکیه',
    userName: 'علی احمدی',
    image: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: '2',
    title: 'خاطرات دبی',
    destination: 'دبی، امارات',
    userName: 'سارا محمدی',
    image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=600&auto=format&fit=crop&q=80'
  },
  {
    id: '3',
    title: 'پاییز در تفلیس',
    destination: 'تفلیس، گرجستان',
    userName: 'نیما کریمی',
    image: 'https://images.unsplash.com/photo-1565008447742-97f6f38c985c?w=600&auto=format&fit=crop&q=80'
  }
];

export default function TraveloguesPage() {
  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-10 py-10">
      <h1 className="text-2xl font-black mb-6">سفرنامه‌ها</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {MOCK_TRAVELOGUES.map((t) => (
          <Link key={t.id} href={`/travelogues/${t.id}`} className="block border border-line rounded-2xl overflow-hidden hover:shadow-elev-1 transition bg-surface group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
            <div className="relative w-full h-48 overflow-hidden bg-soft">
              <Image
                src={t.image}
                alt={t.title}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="p-4">
              <h2 className="text-lg font-black mb-2 group-hover:text-brand transition-colors">{t.title}</h2>
              <p className="text-sm text-sub mb-2">{t.destination}</p>
              <p className="text-xs text-brand-dark bg-mint inline-block px-2 py-1 rounded-md">{t.userName}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
