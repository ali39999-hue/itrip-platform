import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';

export default async function AdminToursPage() {
  const locale = await getLocale();
  redirect(`/${locale}/admin/content?tab=tours`);
}
