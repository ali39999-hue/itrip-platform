import { redirect } from 'next/navigation';

/**
 * Canonical Explore hub is `/book` (D-004 / Q-002).
 * Keep `/services` as an alias so old links and SEO URLs still land on the hub.
 */
export default async function ServicesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/book`);
}
