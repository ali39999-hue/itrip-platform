'use client';

import { useState, useCallback } from 'react';

export function useHotelComparison() {
  const [favs, setFavs] = useState<Set<string>>(new Set());
  const [cmp, setCmp] = useState<Set<string>>(new Set());

  const toggleFav = useCallback((id: string) => {
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

  const toggleCmp = useCallback((id: string) => {
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

  const isFav = useCallback((id: string) => favs.has(id), [favs]);
  const isCmp = useCallback((id: string) => cmp.has(id), [cmp]);

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
