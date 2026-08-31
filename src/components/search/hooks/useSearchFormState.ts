'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { SEARCH_TABS, type SearchTabId } from '../SearchModeTabs';

const ROUTES: Record<SearchTabId, string> = {
  plan: '/plan',
  flights: '/flights/search',
  hotels: '/hotels/search',
  tours: '/tours',
};

export function useSearchFormState(initialTab: SearchTabId = 'plan') {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('Search');

  const [tab, setTab] = useState<SearchTabId>(initialTab);
  const [query, setQuery] = useState('');
  const [dest, setDest] = useState('');
  const [routeTo, setRouteTo] = useState('');
  const [date1, setDate1] = useState('');
  const [date2, setDate2] = useState('');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [rooms, setRooms] = useState(1);
  const [guestOpen, setGuestOpen] = useState(false);
  const [error, setError] = useState('');
  const [tourType, setTourType] = useState('recreational');

  const tabDef = SEARCH_TABS.find((tb) => tb.id === tab)!;

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

    if (!dest.trim()) {
      setError(tabDef.routeMode ? t('errFrom') : t('errDest'));
      return;
    }
    if (tabDef.routeMode && !routeTo.trim()) {
      setError(t('errDest'));
      return;
    }
    setError('');

    let q = '';
    if (tabDef.routeMode) {
      q = `?from=${encodeURIComponent(dest)}&to=${encodeURIComponent(routeTo)}`;
      if (date1) q += `&depart=${encodeURIComponent(date1)}`;
      if (date2) q += `&return=${encodeURIComponent(date2)}`;
      q += `&adults=${adults}&children=${children}`;
    } else if (tab === 'hotels') {
      q = `?city=${encodeURIComponent(dest)}`;
      if (date1) q += `&checkin=${encodeURIComponent(date1)}`;
      if (date2) q += `&checkout=${encodeURIComponent(date2)}`;
      q += `&rooms=${rooms}&adults=${adults}`;
    } else {
      q = `?city=${encodeURIComponent(dest)}&type=${encodeURIComponent(tourType)}`;
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
