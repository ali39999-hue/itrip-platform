'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CountryId } from '@/lib/countries';

interface CountryState {
  country: CountryId;
  setCountry: (c: CountryId) => void;
}

export const useCountryStore = create<CountryState>()(
  persist(
    (set) => ({
      country: 'iran',
      setCountry: (country) => set({ country }),
    }),
    {
      name: 'firuzo-country',
      version: 1,
      partialize: (state) => ({
        country: state.country,
      }),
      migrate: (persistedState: unknown) => {
        const state = persistedState as Partial<CountryState> | undefined;
        const validCountries: CountryId[] = ['iran', 'russia', 'turkey', 'uae', 'georgia', 'oman', 'china'];
        if (!state?.country || !validCountries.includes(state.country)) {
          return { country: 'iran' as CountryId } as CountryState;
        }
        return persistedState as CountryState;
      },
    }
  )
);
