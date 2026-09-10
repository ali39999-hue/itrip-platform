'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { shimmerDataUrl } from '@/lib/image-utils';

interface TourImageProps {
  src: string;
  alt: string;
  fallbackSrc?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  priority?: boolean;
  loading?: 'lazy' | 'eager';
  className?: string;
}

const DEFAULT_FALLBACK = '/images/isfahan/sheikh-lotfollah.jpg';

export function TourImage({
  src,
  alt,
  fallbackSrc = DEFAULT_FALLBACK,
  fill = true,
  width,
  height,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  priority = false,
  loading,
  className = 'object-cover',
}: TourImageProps) {
  const [imgSrc, setImgSrc] = useState(src);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setImgSrc(src);
    setFailed(false);
  }, [src]);

  function handleError() {
    if (!failed) {
      setFailed(true);
      setImgSrc(fallbackSrc);
    }
  }

  return (
    <Image
      src={imgSrc || fallbackSrc}
      alt={alt}
      fill={fill}
      width={!fill ? width : undefined}
      height={!fill ? height : undefined}
      sizes={sizes}
      priority={priority}
      loading={loading}
      placeholder="blur"
      blurDataURL={shimmerDataUrl(width || 400, height || 260)}
      onError={handleError}
      className={className}
    />
  );
}
