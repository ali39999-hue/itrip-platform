import { redirect } from 'next/navigation';

/**
 * Canonical redirect: /trips -> /my-trips (Single Source of Truth for Trips UI)
 */
export default async function TripsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/my-trips`);
}
