'use client';

import React from 'react';
import type { HotelSkeletonListProps } from './types';

export function HotelSkeletonList({ count = 3 }: HotelSkeletonListProps) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-surface border border-line rounded-2xl p-5 flex flex-col md:flex-row gap-5 animate-pulse"
        >
          <div className="w-full md:w-64 h-44 rounded-xl bg-soft shrink-0" />
          <div className="flex-1 space-y-4 py-2">
            <div className="h-5 w-48 bg-soft rounded" />
            <div className="h-3 w-32 bg-soft rounded" />
            <div className="h-3 w-full max-w-md bg-soft rounded" />
            <div className="flex justify-between items-end pt-4">
              <div className="h-4 w-28 bg-soft rounded" />
              <div className="h-10 w-32 bg-soft rounded-xl" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
