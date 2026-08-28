import { redirect } from '@/i18n/routing';

export default async function HotelsIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: '/hotels/search', locale });
}
