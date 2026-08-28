import { redirect } from '@/i18n/routing';

export default async function FlightsIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: '/flights/search', locale });
}
