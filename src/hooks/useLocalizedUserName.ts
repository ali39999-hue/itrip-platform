'use client';

import { useLocale } from 'next-intl';
import { useAuthStore } from '@/stores/auth-store';

export function useLocalizedUserName(): string {
  const locale = useLocale() as 'en' | 'fa' | 'ar' | 'zh' | 'ru';
  const user = useAuthStore((s) => s.user);

  if (!user) return '';

  // Use the new names structure if available
  if (user.names && user.names[locale]) {
    const { firstName, lastName } = user.names[locale];
    if (firstName || lastName) {
      return `${firstName} ${lastName}`.trim();
    }
  }

  // Fallback to legacy fields (Persian)
  if (user.firstNameFa || user.lastNameFa) {
    return `${user.firstNameFa} ${user.lastNameFa}`.trim();
  }

  // Fallback to English if available
  if (locale === 'en' && (user.firstNameEn || user.lastNameEn)) {
    return `${user.firstNameEn || ''} ${user.lastNameEn || ''}`.trim();
  }

  return '';
}

export function useLocalizedUserNameWithPhone(): { name: string; phone: string } {
  const user = useAuthStore((s) => s.user);
  const name = useLocalizedUserName();

  return {
    name,
    phone: user?.phone || '',
  };
}
