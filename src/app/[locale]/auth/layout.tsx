import { localizedMetadata } from '@/lib/page-metadata';

// Private area: never indexed by search engines.
export const generateMetadata = localizedMetadata({
  title: { fa: 'فیروزه', en: 'Firuzo', ar: 'فيروزو', zh: 'Firuzo', ru: 'Firuzo' },
  description: { fa: 'حساب کاربری فیروزه', en: 'Firuzo account area', ar: 'حساب فيروزو', zh: 'Firuzo 账户', ru: 'Аккаунт Firuzo' },
  noindex: true,
});

export default function MetadataLayout({ children }: { children: React.ReactNode }) {
  return children;
}
