import { localizedMetadata } from '@/lib/page-metadata';
import type { LText } from '@/lib/lt';

import faMessages from '../../../../messages/fa.json';
import enMessages from '../../../../messages/en.json';
import arMessages from '../../../../messages/ar.json';
import zhMessages from '../../../../messages/zh.json';
import ruMessages from '../../../../messages/ru.json';

// Server-only: shared catalog copy keeps the cart metadata out of inline FA
// literals (I18N-103 debt ratchet) while reusing the standard metadata builder.
const title: LText = {
  fa: faMessages.Metadata?.cart?.title ?? '',
  en: enMessages.Metadata?.cart?.title ?? '',
  ar: arMessages.Metadata?.cart?.title,
  zh: zhMessages.Metadata?.cart?.title,
  ru: ruMessages.Metadata?.cart?.title,
};

const description: LText = {
  fa: faMessages.Metadata?.cart?.description ?? '',
  en: enMessages.Metadata?.cart?.description ?? '',
  ar: arMessages.Metadata?.cart?.description,
  zh: zhMessages.Metadata?.cart?.description,
  ru: ruMessages.Metadata?.cart?.description,
};

export const generateMetadata = localizedMetadata({
  title,
  description,
  path: '/cart',
});

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children;
}
