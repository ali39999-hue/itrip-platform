import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { COUNTRIES, EXPERIENCE_CATEGORY_META, type CountryId, type ExperienceCategory, type SignatureExperience } from '@/lib/countries';
import { FLIGHTS, HOTELS, TRANSFERS, ESIM_PACKAGES, INSURANCE_PLANS, PLANNER_MAP } from '@/lib/data';
import { interpreterGroupPlan } from '@/lib/interpreters';
import { useCountryStore } from '@/stores/country-store';

export type BudgetTier = 'economy' | 'balanced' | 'luxury';
export type Pace = 'relaxed' | 'balanced' | 'packed';
export type Who = 'solo' | 'duo' | 'family' | 'friends';

export const BUDGET_CAP: Record<BudgetTier, number> = { economy: 45_000_000, balanced: 120_000_000, luxury: 400_000_000 };
export const BUDGET_LABEL: Record<BudgetTier, { fa: string; en: string }> = {
  economy: { fa: 'اقتصادی', en: 'Economy' },
  balanced: { fa: 'متعادل', en: 'Balanced' },
  luxury: { fa: 'لوکس', en: 'Luxury' },
};
export const WHO_MAP: Record<Who, { adults: number; children: number }> = {
  solo: { adults: 1, children: 0 },
  duo: { adults: 2, children: 0 },
  family: { adults: 2, children: 2 },
  friends: { adults: 4, children: 0 },
};
export const PACE_PER_DAY: Record<Pace, number> = { relaxed: 1, balanced: 2, packed: 3 };

export interface Answers {
  dest?: CountryId;
  who?: Who;
  days?: number;
  interests?: ExperienceCategory[];
  budget?: BudgetTier;
  pace?: Pace;
}

export interface PickedExperience {
  e: SignatureExperience;
  day: number;
  slot: number;
  why: string;
}

export function usePlanner({
  ans,
  tune,
  addOnTransfer,
  addOnEsim,
  addOnInsurance,
  addOnInterpreter,
  seed,
  isEn,
}: {
  ans: Answers;
  tune: { cheaper: boolean; more: boolean };
  addOnTransfer: boolean;
  addOnEsim: boolean;
  addOnInsurance: boolean;
  addOnInterpreter: boolean;
  seed: number;
  isEn: boolean;
}) {
  const t = useTranslations('Plan');
  const { country } = useCountryStore();
  const destId = ans.dest ?? country;
  const c = COUNTRIES[destId as CountryId];
  const who = ans.who ?? 'duo';
  const days = ans.days ?? 4;
  const { adults, children } = WHO_MAP[who];
  const travelers = adults + children;
  const budget = ans.budget ?? 'balanced';
  const paceBase = ans.pace ?? 'balanced';
  const pace: Pace = tune.more ? (paceBase === 'relaxed' ? 'balanced' : 'packed') : paceBase;
  const interests = useMemo(() => ans.interests ?? [], [ans.interests]);

  const plan = useMemo(() => {
    const map = PLANNER_MAP[c.id];
    const flight = FLIGHTS.find((f) => f.destinationCity === map.flightCity) ?? FLIGHTS[0];
    const hotel = HOTELS.find((h) => h.id === map.hotelId) ?? HOTELS[0];
    const transfer = TRANSFERS.find((tr) => tr.id === map.transferId) ?? null;
    const esim = map.esimCountry ? ESIM_PACKAGES.find((e) => e.country === map.esimCountry) ?? null : null;
    const insurance = INSURANCE_PLANS[0];
    const capPerPerson = BUDGET_CAP[budget];
    const perDay = PACE_PER_DAY[pace];

    const scored = c.signatureExperiences
      .map((e: SignatureExperience) => {
        const catMatch = interests.length === 0 || interests.includes(e.category);
        const priceFit = e.fromPrice <= capPerPerson * 0.6;
        let score = (catMatch ? 2 : 0) + (priceFit ? 1 : 0);
        if (tune.cheaper) score += (capPerPerson - e.fromPrice) / capPerPerson;
        return { e, score, catMatch, priceFit };
      })
      .sort((a, b) => b.score - a.score || a.e.fromPrice - b.e.fromPrice);

    const picked: PickedExperience[] = [];
    let spentPerPerson = 0;
    const pool = [...scored];
    if (seed > 0) pool.sort((a, b) => (((a.e.titleEn.length * 7 + seed * 13) % 5) - ((b.e.titleEn.length * 7 + seed * 13) % 5)) || b.score - a.score);
    for (let day = 1; day <= days; day++) {
      let slot = 1;
      const todayCount = Math.min(perDay, day === 1 ? Math.max(1, perDay - 1) : perDay);
      while (slot <= todayCount) {
        let idx = pool.findIndex((p) => p.score >= 2 && spentPerPerson + p.e.fromPrice <= capPerPerson);
        if (idx < 0) idx = pool.findIndex((p) => spentPerPerson + p.e.fromPrice <= capPerPerson);
        if (idx < 0) break;
        const item = pool.splice(idx, 1)[0];
        const whyParts: string[] = [];
        const cat = item.e.category as ExperienceCategory;
        if (interests.includes(cat)) whyParts.push(t('whyCat', { cat: isEn ? EXPERIENCE_CATEGORY_META[cat].en : EXPERIENCE_CATEGORY_META[cat].fa }));
        whyParts.push(isEn ? item.e.whereEn : item.e.where);
        picked.push({
          e: item.e, day, slot,
          why: whyParts.length ? `${t('why')} ${whyParts.slice(0, 2).join(isEn ? ' & ' : ' و ')}` : t('whyDefault'),
        });
        spentPerPerson += item.e.fromPrice;
        slot++;
      }
    }

    const rooms = Math.max(1, Math.ceil(adults / 2) + (children > 0 ? 1 : 0));
    const nights = Math.max(1, days - 1);
    const flightTotal = flight.price * travelers;
    const hotelTotal = hotel.pricePerNight * nights * rooms;
    const expTotalAll = picked.reduce((s, p) => s + p.e.fromPrice, 0) * travelers;

    const cultural = picked.some((p) => ['culture', 'theater', 'exhibition', 'festival'].includes(p.e.category));
    const suggestInterpreter = cultural || who === 'family';
    const gi = interpreterGroupPlan(travelers);
    const interpreterDays = suggestInterpreter ? Math.min(days, 2) : 0;
    const interpreterTotal = suggestInterpreter && addOnInterpreter ? gi.dailyTotal * interpreterDays : 0;

    const transferTotal = transfer ? transfer.price * (rooms > 2 ? 2 : 1) : 0;
    const esimTotal = esim ? esim.price * travelers : 0;
    const insuranceTotal = insurance ? insurance.price * travelers : 0;
    const addOnsTotal =
      (addOnTransfer ? transferTotal : 0) +
      (addOnEsim ? esimTotal : 0) +
      (addOnInsurance ? insuranceTotal : 0) +
      interpreterTotal;
    const total = flightTotal + hotelTotal + expTotalAll + addOnsTotal;
    const overBy = expTotalAll - capPerPerson * travelers;

    return {
      map, flight, hotel, transfer, esim, insurance, picked, rooms, nights,
      flightTotal, hotelTotal, expTotalAll, transferTotal, esimTotal, insuranceTotal,
      interpreterTotal, interpreterDays, gi, suggestInterpreter,
      addOnsTotal, total, overBy, matched: picked.length,
    };
  }, [c, who, days, adults, children, interests, budget, pace, travelers, seed, tune, addOnTransfer, addOnEsim, addOnInsurance, addOnInterpreter, t, isEn]);

  return { plan, c, who, days, travelers, budget, pace, interests };
}

export type PlanPackage = ReturnType<typeof usePlanner>['plan'];
