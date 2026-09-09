import { setRequestLocale } from 'next-intl/server';
import { getSupplierDetail } from '@/actions/admin-suppliers';
import SupplierDetailClient from './SupplierDetailClient';
import { notFound } from 'next/navigation';

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const resolvedParams = await params;
  setRequestLocale(resolvedParams.locale);

  let supplier;
  try {
    supplier = await getSupplierDetail(resolvedParams.id);
  } catch (err) {
    console.error('Failed to load supplier detail:', err);
    notFound();
  }

  if (!supplier) {
    notFound();
  }

  return <SupplierDetailClient supplier={supplier} />;
}
