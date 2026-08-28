'use client';

import { useState, useCallback } from 'react';

export function useHotelComparison() {
  const [favs, setFavs] = useState<Set<number>>(new Set());
  const [cmp, setCmp] = useState<Set<number>>(new Set());

  const toggleFav = useCallback((id: number) => {
    setFavs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleCmp = useCallback((id: number) => {
    setCmp((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 3) {
        next.add(id);
      }
      return next;
    });
  }, []);

  const clearCmp = useCallback(() => {
    setCmp(new Set());
  }, []);

  const isFav = useCallback((id: number) => favs.has(id), [favs]);
  const isCmp = useCallback((id: number) => cmp.has(id), [cmp]);

  return {
    favs,
    cmp,
    toggleFav,
    toggleCmp,
    clearCmp,
    isFav,
    isCmp,
  };
}
