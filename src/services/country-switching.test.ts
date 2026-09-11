import { describe, it, expect, beforeEach } from 'vitest';
import { useCountryStore } from '@/stores/country-store';
import { searchHotels, detectCountryId } from '@/services/hotels-service';
import { searchFlights } from '@/services/flights-service';
import { COUNTRIES, type CountryId } from '@/lib/countries';
import { VISA_SERVICES, ESIM_PACKAGES, TRANSFERS } from '@/lib/data';

describe('Country Switching & Dynamic Ecosystem Synchronization Suite', () => {
  beforeEach(() => {
    useCountryStore.setState({ country: 'iran' });
  });

  it('updates country state in Zustand store and retrieves valid country configuration', () => {
    expect(useCountryStore.getState().country).toBe('iran');

    useCountryStore.getState().setCountry('turkey');
    expect(useCountryStore.getState().country).toBe('turkey');
    expect(COUNTRIES.turkey.nameFa).toBe('ترکیه');
    expect(COUNTRIES.turkey.cities.length).toBeGreaterThanOrEqual(4);

    useCountryStore.getState().setCountry('uae');
    expect(useCountryStore.getState().country).toBe('uae');
    expect(COUNTRIES.uae.nameFa).toBe('امارات');
  });

  it('detectCountryId accurately maps city names across 7 target countries', () => {
    expect(detectCountryId('استانبول', 'Istanbul')).toBe('turkey');
    expect(detectCountryId('دبی', 'Dubai')).toBe('uae');
    expect(detectCountryId('تفلیس', 'Tbilisi')).toBe('georgia');
    expect(detectCountryId('مسقط', 'Muscat')).toBe('oman');
    expect(detectCountryId('مسکو', 'Moscow')).toBe('russia');
    expect(detectCountryId('پکن', 'Beijing')).toBe('china');
    expect(detectCountryId('مشهد', 'Mashhad')).toBe('iran');
  });

  it('searchHotels dynamically isolates results when country is switched', () => {
    // When Turkey is selected, returns Turkish hotels
    const turkeyResults = searchHotels({ country: 'turkey' });
    expect(turkeyResults.hotels.length).toBeGreaterThan(0);
    expect(turkeyResults.hotels.every((h) => h.countryId === 'turkey')).toBe(true);
    expect(turkeyResults.hotels.some((h) => h.city.includes('استانبول') || h.cityEn?.includes('Istanbul'))).toBe(true);

    // When UAE is selected, returns UAE hotels
    const uaeResults = searchHotels({ country: 'uae' });
    expect(uaeResults.hotels.length).toBeGreaterThan(0);
    expect(uaeResults.hotels.every((h) => h.countryId === 'uae')).toBe(true);
    expect(uaeResults.hotels.some((h) => h.city.includes('دبی') || h.cityEn?.includes('Dubai'))).toBe(true);

    // When Georgia is selected, returns Georgia hotels
    const georgiaResults = searchHotels({ country: 'georgia' });
    expect(georgiaResults.hotels.length).toBeGreaterThan(0);
    expect(georgiaResults.hotels.every((h) => h.countryId === 'georgia')).toBe(true);

    // When Iran is selected, returns Iranian hotels
    const iranResults = searchHotels({ country: 'iran' });
    expect(iranResults.hotels.length).toBeGreaterThan(0);
    expect(iranResults.hotels.every((h) => h.countryId === 'iran')).toBe(true);
  });

  it('searchFlights dynamically prioritizes or scopes routes based on target country', () => {
    // When Turkey is selected without destination city, returns flights to Turkey
    const turkeyFlights = searchFlights({ country: 'turkey' });
    expect(turkeyFlights.flights.length).toBeGreaterThan(0);
    expect(turkeyFlights.flights.some((f) => f.destinationCity.includes('استانبول') || f.destinationCity.includes('آنتالیا'))).toBe(true);

    // When UAE is selected without destination city, returns flights to UAE
    const uaeFlights = searchFlights({ country: 'uae' });
    expect(uaeFlights.flights.length).toBeGreaterThan(0);
    expect(uaeFlights.flights.some((f) => f.destinationCity.includes('دبی'))).toBe(true);

    // When Georgia is selected without destination city, returns flights to Georgia
    const georgiaFlights = searchFlights({ country: 'georgia' });
    expect(georgiaFlights.flights.length).toBeGreaterThan(0);
    expect(georgiaFlights.flights.some((f) => f.destinationCity.includes('تفلیس'))).toBe(true);

    // When Iran is selected without destination city, returns domestic flights
    const iranFlights = searchFlights({ country: 'iran' });
    expect(iranFlights.flights.length).toBeGreaterThan(0);
    expect(iranFlights.flights.some((f) => f.destinationCity.includes('مشهد'))).toBe(true);
  });

  it('every supported country has corresponding VISA services and eSIM packages', () => {
    const supportedCountries: CountryId[] = ['turkey', 'uae', 'georgia', 'russia', 'oman', 'china'];

    for (const cId of supportedCountries) {
      const c = COUNTRIES[cId];
      // Visa check
      const visaExists = VISA_SERVICES.some(
        (v) => v.countryEn.toLowerCase() === c.nameEn.toLowerCase() || v.countryFa === c.nameFa
      );
      expect(visaExists, `Visa service must exist for ${cId}`).toBe(true);

      // eSIM check
      const esimExists = ESIM_PACKAGES.some(
        (e) => (e.countryEn || e.country).toLowerCase().includes(c.nameEn.toLowerCase()) || (e.countryFa || e.country).includes(c.nameFa)
      );
      expect(esimExists, `eSIM package must exist for ${cId}`).toBe(true);
    }
  });

  it('every supported country has airport transfers available', () => {
    const supportedCountries: CountryId[] = ['iran', 'turkey', 'uae', 'georgia', 'russia', 'oman'];

    for (const cId of supportedCountries) {
      const c = COUNTRIES[cId];
      const cities = c.cities.map((ct) => ct.fa);
      const citiesEn = c.cities.map((ct) => ct.en.toLowerCase());

      const transferExists = TRANSFERS.some(
        (t) =>
          cities.some((ci) => t.from.includes(ci) || t.to.includes(ci)) ||
          citiesEn.some((ci) => t.fromEn.toLowerCase().includes(ci) || t.toEn.toLowerCase().includes(ci))
      );
      expect(transferExists, `Airport transfer must exist for ${cId}`).toBe(true);
    }
  });
});
