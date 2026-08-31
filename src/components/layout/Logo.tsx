'use client';
import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';

export interface LogoProps {
  variant?: 'full' | 'icon' | 'monochrome';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Logo({ variant = 'full', size = 'md', className = '' }: LogoProps) {
  const t = useTranslations('Logo');
  const ct = useTranslations('Common');

  const dims = {
    sm: { img: 28, text: 'text-base', sub: 'text-[9px]' },
    md: { img: 36, text: 'text-lg sm:text-xl', sub: 'text-[10px]' },
    lg: { img: 48, text: 'text-2xl', sub: 'text-xs' },
  }[size];

  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-2.5 group focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none rounded-xl p-1 -m-1 transition-all ${className}`}
      aria-label={ct('aria.homepage')}
    >
      <div className="relative shrink-0 transition-transform duration-300 group-hover:scale-105">
        <Image
          src="/images/logo.png"
          alt="Firuzo Logo"
          width={dims.img}
          height={dims.img}
          className="object-contain drop-shadow-sm"
          priority
        />
      </div>

      {variant === 'full' && (
        <div className="flex flex-col text-start leading-tight">
          <span className={`font-black tracking-tight text-ink group-hover:text-brand-dark transition-colors ${dims.text}`}>
            {t('name')}
          </span>
          <span className={`font-bold text-sub tracking-wider uppercase ${dims.sub}`}>
            {t('tagline')}
          </span>
        </div>
      )}
    </Link>
  );
}
