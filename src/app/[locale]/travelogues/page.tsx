'use client';

import { Link } from '@/i18n/routing';

const MOCK_TRAVELOGUES = [
  {
    id: '1',
    title: 'سفر سه روزه به استانبول',
    destination: 'استانبول، ترکیه',
    userName: 'علی احمدی',
    image: 'https://picsum.photos/seed/t1/400/300'
  },
  {
    id: '2',
    title: 'خاطرات دبی',
    destination: 'دبی، امارات',
    userName: 'سارا محمدی',
    image: 'https://picsum.photos/seed/t2/400/300'
  },
  {
    id: '3',
    title: 'پاییز در پاریس',
    destination: 'پاریس، فرانسه',
    userName: 'نیما کریمی',
    image: 'https://picsum.photos/seed/t3/400/300'
  }
];

export default function TraveloguesPage() {
  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-10 py-10">
      <h1 className="text-2xl font-black mb-6">سفرنامه‌ها</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {MOCK_TRAVELOGUES.map((t) => (
          <Link key={t.id} href={`/travelogues/${t.id}`} className="block border border-line rounded-2xl overflow-hidden hover:shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
            <img src={t.image} alt={t.title} className="w-full h-48 object-cover img-arch" />
            <div className="p-4">
              <h2 className="text-lg font-black mb-2">{t.title}</h2>
              <p className="text-sm text-sub mb-2">{t.destination}</p>
              <p className="text-xs text-brand-dark bg-mint inline-block px-2 py-1 rounded-md">{t.userName}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
