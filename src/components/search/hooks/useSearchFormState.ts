'use client';

import { useState, useEffect, useRef } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { useCountryStore } from '@/stores/country-store';
import { COUNTRIES, type CountryId } from '@/lib/countries';
import { SEARCH_TABS, type SearchTabId } from '../SearchModeTabs';

const ROUTES: Record<SearchTabId, string> = {
  plan: '/plan',
  flights: '/flights/search',
  hotels: '/hotels/search',
  tours: '/tours',
};

function getCountryCities(cId: CountryId, loc: string) {
  const isFa = loc === 'fa';
  const cObj = COUNTRIES[cId] || COUNTRIES.iran;
  const primary = cObj.cities?.[0];
  const isIran = cId === 'iran';
  const origin = isFa ? 'تهران' : 'Tehran';
  const flightDest = isIran
    ? (isFa ? 'مشهد' : 'Mashhad')
    : isFa
      ? primary?.fa || 'مشهد'
      : primary?.en || 'Mashhad';
  const hotelDest = isIran
    ? (isFa ? 'مشهد' : 'Mashhad')
    : isFa
      ? primary?.fa || 'مشهد'
      : primary?.en || 'Mashhad';
  return { origin, flightDest, hotelDest };
}

export function useSearchFormState(initialTab: SearchTabId = 'flights') {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('Search');
  const { country } = useCountryStore();

  const { origin: defaultFrom, flightDest: defaultTo, hotelDest: defaultHotelCity } = getCountryCities(country, locale);

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

  // React to country AND locale changes from header switchers across the entire platform
  const prevCountryRef = useRef(country);
  const prevLocaleRef = useRef(locale);

  useEffect(() => {
    const countryChanged = prevCountryRef.current !== country;
    const localeChanged = prevLocaleRef.current !== locale;

    if (countryChanged || localeChanged) {
      prevCountryRef.current = country;
      prevLocaleRef.current = locale;

      const { origin, flightDest, hotelDest } = getCountryCities(country, locale);

      if (tab === 'hotels' || tab === 'tours') {
        setDest(hotelDest);
      } else if (tab === 'flights') {
        setDest(origin);
        setRouteTo(flightDest);
      } else if (tab === 'plan') {
        setQuery(hotelDest);
      }
    }
  }, [country, locale, tab]);

  const tabDef = SEARCH_TABS.find((tb) => tb.id === tab)!;

  function setTab(newTab: SearchTabId) {
    setTabState(newTab);
    setError('');
    const { origin, flightDest, hotelDest } = getCountryCities(country, locale);
    if (newTab === 'hotels' || newTab === 'tours') {
      setDest(hotelDest);
      if (!date2) {
        setDate2('2026-09-26');
      }
    } else if (newTab === 'flights') {
      setDest(origin);
      setRouteTo(flightDest);
    }
  }

  function submit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const { origin, flightDest, hotelDest } = getCountryCities(country, locale);

    if (tab === 'plan') {
      if (!query.trim()) {
        router.push('/plan');
      } else {
        router.push(`/plan?q=${encodeURIComponent(query)}`);
      }
      return;
    }

    // Gracefully fallback to sensible standard destinations if left empty
    const effectiveFrom = dest.trim() || origin;
    const effectiveTo = routeTo.trim() || flightDest;
    const effectiveDest = dest.trim() || hotelDest;

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
