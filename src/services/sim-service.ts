/**
 * eCardo SIM & eSIM Service (SUP-201)
 *
 * Provides real-time and cached inventory for international eSIM and visitor SIM products:
 * - Powered by eCardo Travel Platform (trip.ecardo.ir) via EcardoTravelClient
 * - Cached in-memory with 1-hour TTL
 * - Automatic fallback to canonical offline package catalog if supplier network fails
 * - Supports airport delivery points, hotel desks, and QR-code eSIM delivery
 */

import { EcardoTravelClient } from '@/domains/supplier/adapters/EcardoTravelClient';
import { ESIM_PACKAGES } from '@/lib/data';
import { CURRENCY_TO_TOMAN } from '@/lib/money';

export interface SimPackageItem {
  id: string | number;
  productId: string | number;
  name: string;
  dataGb: number;
  durationDays: number;
  voiceMinutes?: number | null;
  priceUsd: number;
  priceToman: number;
  countryCode: string;
  countryName: string;
  isEsim: boolean;
  type: string;
  features: string[];
}

export interface SimDeliveryPoint {
  id: number;
  name: string;
  city: string;
  type: 'AIRPORT' | 'HOTEL';
}

export interface SimCatalogResult {
  source: 'LIVE_ECARDO' | 'STATIC_FALLBACK';
  packages: SimPackageItem[];
  airports: SimDeliveryPoint[];
  hotels: SimDeliveryPoint[];
  updatedAt: string;
}

interface CacheRecord {
  catalog: SimCatalogResult;
  expiresAt: number;
}

let memoryCache: CacheRecord | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export class SimService {
  private static client: EcardoTravelClient | null = null;

  private static getClient(): EcardoTravelClient {
    if (!this.client) {
      this.client = new EcardoTravelClient();
    }
    return this.client;
  }

  /**
   * Builds the offline fallback catalog from ESIM_PACKAGES.
   */
  private static getFallbackCatalog(): SimCatalogResult {
    const packages: SimPackageItem[] = ESIM_PACKAGES.map((p) => {
      const priceToman = p.price;
      const priceUsd = Number((priceToman / CURRENCY_TO_TOMAN.USD).toFixed(2));
      return {
        id: p.id,
        productId: p.id,
        name: `${p.countryFa || p.country} - ${p.dataGb}GB`,
        dataGb: p.dataGb,
        durationDays: p.validityDays,
        voiceMinutes: null,
        priceUsd,
        priceToman,
        countryCode: 'GLO',
        countryName: p.countryFa || p.country,
        isEsim: true,
        type: 'data',
        features: ['فعال‌سازی آنی با QR کد', 'سرعت 4G/5G', 'بدون نیاز به سیم‌کارت فیزیکی'],
      };
    });

    return {
      source: 'STATIC_FALLBACK',
      packages,
      airports: [
        { id: 1, name: 'فرودگاه بین‌المللی امام خمینی (IKA)', city: 'تهران', type: 'AIRPORT' },
        { id: 2, name: 'فرودگاه بین‌المللی مهرآباد (THR)', city: 'تهران', type: 'AIRPORT' },
        { id: 3, name: 'فرودگاه شهید دستغیب شیراز (SYZ)', city: 'شیراز', type: 'AIRPORT' },
        { id: 4, name: 'فرودگاه شهید هاشمی‌نژاد مشهد (MHD)', city: 'مشهد', type: 'AIRPORT' },
      ],
      hotels: [
        { id: 1, name: 'هتل اسپیناس پالاس', city: 'تهران', type: 'HOTEL' },
        { id: 2, name: 'هتل عباسی', city: 'اصفهان', type: 'HOTEL' },
        { id: 3, name: 'هتل هما', city: 'شیراز', type: 'HOTEL' },
        { id: 4, name: 'هتل مجلل درویشی', city: 'مشهد', type: 'HOTEL' },
      ],
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Fetches the consolidated live catalog from eCardo Travel Platform with automatic caching and fallback.
   */
  static async getCatalog(forceRefresh: boolean = false): Promise<SimCatalogResult> {
    const now = Date.now();
    if (!forceRefresh && memoryCache && memoryCache.expiresAt > now) {
      return memoryCache.catalog;
    }

    try {
      const client = this.getClient();
      const [productsRes, airportsRes, hotelsRes] = await Promise.all([
        client.getSimProducts().catch(() => null),
        client.getSimAirports().catch(() => null),
        client.getSimHotels().catch(() => null),
      ]);

      if (!productsRes || !productsRes.data || !Array.isArray(productsRes.data) || productsRes.data.length === 0) {
        return this.getFallbackCatalog();
      }

      const usdToToman = CURRENCY_TO_TOMAN.USD || 55000;
      const packages: SimPackageItem[] = [];

      for (const prod of productsRes.data as unknown as Array<{
        id: number;
        title: string;
        description: string;
        country_code: string;
        is_esim: number | boolean;
        type: string;
        selling_price: string;
        packages?: Array<{
          id: number;
          product_id: number;
          name: string;
          data_gb: number;
          duration_days: number;
          voice_minutes: number | null;
          price: string;
        }>;
      }>) {
        const isEsim = Boolean(prod.is_esim);
        const countryName =
          prod.country_code === 'IRN' ? 'ایران' :
          prod.country_code === 'CHN' ? 'چین' :
          prod.country_code === 'TUR' ? 'ترکیه' :
          prod.country_code === 'ARE' ? 'امارات' : 'بین‌المللی (Global)';

        if (Array.isArray(prod.packages) && prod.packages.length > 0) {
          for (const subPkg of prod.packages) {
            const priceUsd = parseFloat(subPkg.price) || 10;
            const priceToman = Math.round(priceUsd * usdToToman);
            packages.push({
              id: `ecardo_${prod.id}_${subPkg.id}`,
              productId: prod.id,
              name: `${countryName} · ${subPkg.name}`,
              dataGb: subPkg.data_gb || 5,
              durationDays: subPkg.duration_days || 15,
              voiceMinutes: subPkg.voice_minutes,
              priceUsd,
              priceToman,
              countryCode: prod.country_code,
              countryName,
              isEsim,
              type: prod.type,
              features: isEsim
                ? ['فعال‌سازی آنی با QR کد', 'پوشش شبکه 4G/5G پرسرعت', 'امکان اشتراک هات‌اسپات']
                : ['تحویل فوری در باجه فرودگاه یا لابی هتل', 'سیم‌کارت فیزیکی بدون نیاز به فعال‌سازی پیچیده', 'پشتیبانی تماس و دیتا'],
            });
          }
        } else {
          const priceUsd = parseFloat(prod.selling_price) || 10;
          const priceToman = Math.round(priceUsd * usdToToman);
          packages.push({
            id: `ecardo_${prod.id}`,
            productId: prod.id,
            name: `${countryName} · ${prod.title}`,
            dataGb: 5,
            durationDays: 15,
            priceUsd,
            priceToman,
            countryCode: prod.country_code,
            countryName,
            isEsim,
            type: prod.type,
            features: isEsim
              ? ['فعال‌سازی آنی با QR کد', 'پوشش بین‌المللی']
              : ['تحویل در باجه فرودگاه/هتل', 'اینترنت 4G محلی'],
          });
        }
      }

      // Also append the classic regional packages for full coverage
      if (packages.length < 5) {
        const fallback = this.getFallbackCatalog();
        packages.push(...fallback.packages);
      }

      const airports: SimDeliveryPoint[] = Array.isArray(airportsRes?.data)
        ? airportsRes.data.map((a: { id: number; name: string; city: string }) => ({
            id: a.id,
            name: a.name,
            city: a.city,
            type: 'AIRPORT' as const,
          }))
        : this.getFallbackCatalog().airports;

      const hotels: SimDeliveryPoint[] = Array.isArray(hotelsRes?.data)
        ? hotelsRes.data.map((h: { id: number; name: string; city: string }) => ({
            id: h.id,
            name: h.name,
            city: h.city,
            type: 'HOTEL' as const,
          }))
        : this.getFallbackCatalog().hotels;

      const result: SimCatalogResult = {
        source: 'LIVE_ECARDO',
        packages,
        airports,
        hotels,
        updatedAt: new Date().toISOString(),
      };

      memoryCache = {
        catalog: result,
        expiresAt: now + CACHE_TTL_MS,
      };

      return result;
    } catch {
      return this.getFallbackCatalog();
    }
  }
}
