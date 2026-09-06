'use client';

import { useState, useCallback } from 'react';

export function useFlightComparison() {
  const [cmp, setCmp] = useState<Set<string>>(new Set());

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

  const isCmp = useCallback((id: string) => cmp.has(id), [cmp]);

  return {
    cmp,
    toggleCmp,
    clearCmp,
    isCmp,
  };
}
