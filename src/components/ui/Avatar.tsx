import * as React from 'react';
import Image from 'next/image';

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

function Avatar({ className = '', size = 'md', ...props }: AvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  };

  return (
    <div
      className={`relative inline-flex shrink-0 overflow-hidden rounded-full border border-line/80 bg-soft select-none ${sizeClasses[size]} ${className}`}
      {...props}
    />
  );
}

function AvatarImage({
  src,
  alt = 'Avatar',
  className = '',
}: {
  src: string;
  alt?: string;
  className?: string;
}) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="64px"
      className={`aspect-square h-full w-full object-cover ${className}`}
    />
  );
}

function AvatarFallback({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex h-full w-full items-center justify-center rounded-full bg-mint text-brand-dark font-black ${className}`}
    >
      {children}
    </div>
  );
}

export { Avatar, AvatarImage, AvatarFallback };
