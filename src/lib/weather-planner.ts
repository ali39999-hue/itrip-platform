/**
 * Weather-Aware Activity Planning & Venue Climate Classification.
 * Adapted from TripBreeze AI / Mirai travel systems.
 */

export type VenueSetting = 'indoor' | 'outdoor' | 'semi_covered';

export interface WeatherCondition {
  tempC: number;
  condition: 'sunny' | 'cloudy' | 'rainy' | 'windy';
  conditionFa: string;
  conditionEn: string;
  isRainy: boolean;
}

/**
 * Classifies an experience into indoor/outdoor/semi-covered
 */
export function classifyVenueSetting(category: string, title = ''): VenueSetting {
  const cat = (category || '').toLowerCase();
  const text = (title || '').toLowerCase();

  if (
    cat === 'yacht' ||
    cat === 'nature' ||
    cat === 'adventure' ||
    text.includes('کویر') ||
    text.includes('سافاری') ||
    text.includes('ساحل') ||
    text.includes('پارک') ||
    text.includes('قایق')
  ) {
    return 'outdoor';
  }

  if (
    cat === 'culture' ||
    cat === 'museum' ||
    cat === 'theater' ||
    cat === 'wellness' ||
    cat === 'exhibition' ||
    text.includes('موزه') ||
    text.includes('کاخ') ||
    text.includes('بازار سرپوشیده') ||
    text.includes('آکواریوم')
  ) {
    return 'indoor';
  }

  return 'semi_covered';
}

/**
 * Deterministically generates destination climate forecast for a day index
 */
export function getDestinationDailyWeather(destId: string, dayIndex: number): WeatherCondition {
  const baseTemps: Record<string, number> = {
    iran: 24,
    turkey: 21,
    uae: 31,
    georgia: 19,
    russia: 14,
    oman: 29,
    china: 22,
  };

  const base = baseTemps[destId.toLowerCase()] || 23;
  // Day variations
  const dayOffset = (dayIndex * 3) % 5;
  const tempC = base + dayOffset - 2;

  // Let day 2 or 3 in colder climates have a slight rain forecast to demonstrate weather awareness
  const isRain = (destId === 'turkey' || destId === 'georgia') && dayIndex === 2;

  if (isRain) {
    return {
      tempC: tempC - 4,
      condition: 'rainy',
      conditionFa: 'بارانی ملایم',
      conditionEn: 'Light Rain',
      isRainy: true,
    };
  }

  if (dayIndex % 2 === 1) {
    return {
      tempC,
      condition: 'cloudy',
      conditionFa: 'نیمه ابری',
      conditionEn: 'Partly Cloudy',
      isRainy: false,
    };
  }

  return {
    tempC,
    condition: 'sunny',
    conditionFa: 'آفتابی و مطلوب',
    conditionEn: 'Sunny & Pleasant',
    isRainy: false,
  };
}
