'use client';

import { useState, useEffect, useRef } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { useCountryStore } from '@/stores/country-store';
import { COUNTRIES } from '@/lib/countries';
import { SEARCH_TABS, type SearchTabId } from '../SearchModeTabs';

const ROUTES: Record<SearchTabId, string> = {
  plan: '/plan',
  flights: '/flights/search',
  hotels: '/hotels/search',
  tours: '/tours',
};

export function useSearchFormState(initialTab: SearchTabId = 'flights') {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('Search');
  const { country } = useCountryStore();

  const isFa = locale === 'fa';
  const c = COUNTRIES[country] || COUNTRIES.iran;
  const primaryCity = c.cities?.[0];
  const primaryCityName = isFa ? (primaryCity?.fa || 'مشهد') : (primaryCity?.en || 'Mashhad');

  const defaultFrom = isFa ? 'تهران' : 'Tehran';
  const defaultTo = country === 'iran' ? (isFa ? 'مشهد' : 'Mashhad') : primaryCityName;
  const defaultHotelCity = country === 'iran' ? (isFa ? 'مشهد' : 'Mashhad') : primaryCityName;

  const [tab, setTabState] = useState<SearchTabId>(initialTab);
  const [query, setQuery] = useState('');
  const [dest, setDest] = useState(initialTab === 'hotels' ? defaultHotelCity : defaultFrom);
  const [routeTo, setRouteTo] = useState(defaultTo);
  const [date1, setDate1] = useState('2026-09-22');
  const [date2, setDate2] = useState(initialTab === 'hotels' ? '2026-09-26' : '');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [rooms, setRooms] = useState(1);
  const [guestOpen, setGuestOpen] = useState(false);
  const [error, setError] = useState('');
  const [tourType, setTourType] = useState('recreational');

  // React to country changes from header switcher across the entire platform
  const prevCountryRef = useRef(country);
  useEffect(() => {
    if (prevCountryRef.current !== country) {
      prevCountryRef.current = country;
      const newCountryObj = COUNTRIES[country] || COUNTRIES.iran;
      const newPrimary = newCountryObj.cities?.[0];
      const targetName = isFa ? (newPrimary?.fa || 'مشهد') : (newPrimary?.en || 'Mashhad');
      if (tab === 'hotels' || tab === 'tours') {
        setDest(targetName);
      } else if (tab === 'flights') {
        setRouteTo(targetName);
      } else if (tab === 'plan') {
        setQuery(targetName);
      }
    }
  }, [country, isFa, tab]);

  const tabDef = SEARCH_TABS.find((tb) => tb.id === tab)!;

  function setTab(newTab: SearchTabId) {
    setTabState(newTab);
    setError('');
    if (newTab === 'hotels') {
      if (!dest.trim() || dest === defaultFrom) {
        setDest(defaultHotelCity);
      }
      if (!date2) {
        setDate2('2026-09-26');
      }
    } else if (newTab === 'flights') {
      if (!dest.trim()) setDest(defaultFrom);
      if (!routeTo.trim()) setRouteTo(defaultTo);
    }
  }

  function submit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (tab === 'plan') {
      if (!query.trim()) {
        router.push('/plan');
      } else {
        router.push(`/plan?q=${encodeURIComponent(query)}`);
      }
      return;
    }

    // Gracefully fallback to sensible standard destinations if left empty
    const effectiveFrom = dest.trim() || defaultFrom;
    const effectiveTo = routeTo.trim() || defaultTo;
    const effectiveDest = dest.trim() || defaultHotelCity;

    setError('');

    let q = '';
    if (tabDef.routeMode) {
      q = `?from=${encodeURIComponent(effectiveFrom)}&to=${encodeURIComponent(effectiveTo)}&country=${encodeURIComponent(country)}`;
      if (date1) q += `&depart=${encodeURIComponent(date1)}`;
      if (date2) q += `&return=${encodeURIComponent(date2)}`;
      q += `&adults=${adults}&children=${children}`;
    } else if (tab === 'hotels') {
      const checkinDate = date1 || '2026-09-22';
      const checkoutDate = date2 || '2026-09-26';
      q = `?city=${encodeURIComponent(effectiveDest)}&destination=${encodeURIComponent(effectiveDest)}&country=${encodeURIComponent(country)}`;
      if (checkinDate) q += `&checkin=${encodeURIComponent(checkinDate)}`;
      if (checkoutDate) q += `&checkout=${encodeURIComponent(checkoutDate)}`;
      q += `&rooms=${rooms}&adults=${adults}`;
    } else {
      q = `?city=${encodeURIComponent(effectiveDest)}&type=${encodeURIComponent(tourType)}&country=${encodeURIComponent(country)}`;
    }

    router.push(`${ROUTES[tab]}${q}`);
  }

  function swap() {
    const temp = dest;
    setDest(routeTo);
    setRouteTo(temp);
  }

  return {
    tab,
    setTab,
    tabDef,
    query,
    setQuery,
    dest,
    setDest,
    routeTo,
    setRouteTo,
    date1,
    setDate1,
    date2,
    setDate2,
    adults,
    setAdults,
    children,
    setChildren,
    rooms,
    setRooms,
    guestOpen,
    setGuestOpen,
    error,
    setError,
    tourType,
    setTourType,
    submit,
    swap,
    t,
    locale,
  };
}
