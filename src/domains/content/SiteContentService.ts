import { prisma } from '@/lib/prisma';
import { z } from 'zod';

/**
 * CMS Site Content — typed overrides for hardcoded page blocks.
 *
 * Each key stores a JSON payload validated here. Sections read their override
 * through the homepage server component and fall back to their built-in
 * defaults when a key is absent, so deleting a row always reverts to the
 * shipped content.
 */

export const SITE_CONTENT_KEYS = ['home.hero', 'home.promos', 'home.routes', 'home.faq', 'home.support', 'site.announcement', 'finance.fx_rates'] as const;
export type SiteContentKey = (typeof SITE_CONTENT_KEYS)[number];

// ==================== Payload schemas ====================

// Text pairs: when an admin override exists, locales outside fa/en fall back
// to the English value (the public lt() defaults stay untouched otherwise).
// ar/zh/ru are accepted optionally so five-locale defaults (FaqSection, etc.)
// type-check against the same override contract.
const textPair = z.object({
  fa: z.string().trim().max(300),
  en: z.string().trim().max(300),
  ar: z.string().trim().max(300).optional(),
  zh: z.string().trim().max(300).optional(),
  ru: z.string().trim().max(300).optional(),
});

export const heroSchema = z
  .object({
    title: textPair.partial().optional(),
    subtitle: textPair.partial().optional(),
    imageUrl: z.string().trim().url().max(500).optional().or(z.literal('')),
  })
  .strict();

export const promoBannerSchema = z
  .object({
    id: z.string().trim().min(1).max(40),
    tag: textPair,
    title: textPair,
    subtitle: textPair,
    cta: textPair,
    href: z.string().trim().min(1).max(500),
    img: z.string().trim().url().max(500),
    gradient: z.string().trim().max(200).optional(),
    badgeBg: z.string().trim().max(100).optional(),
    icon: z.enum(['Plane', 'Hotel', 'ShieldCheck', 'Sparkles', 'Compass', 'Gift']).optional(),
  })
  .strict();

export const promosSchema = z.array(promoBannerSchema).min(1).max(6);

export const popularRouteSchema = z
  .object({
    fromFa: z.string().trim().min(1).max(60),
    fromEn: z.string().trim().min(1).max(60),
    toFa: z.string().trim().min(1).max(60),
    toEn: z.string().trim().min(1).max(60),
    airlineFa: z.string().trim().min(1).max(80),
    airlineEn: z.string().trim().min(1).max(80),
    duration: z.string().trim().min(1).max(40),
    durationEn: z.string().trim().min(1).max(40),
    price: z.number().int().min(100000).max(10_000_000_000),
    img: z.string().trim().url().max(500),
  })
  .strict();

export const routesSchema = z.array(popularRouteSchema).min(1).max(12);

export const faqItemSchema = z
  .object({
    q: textPair,
    a: z.object({
      fa: z.string().trim().min(1).max(2000),
      en: z.string().trim().min(1).max(4000),
      ar: z.string().trim().min(1).max(4000).optional(),
      zh: z.string().trim().min(1).max(4000).optional(),
      ru: z.string().trim().min(1).max(4000).optional(),
    }),
  })
  .strict();

export const faqSchema = z.array(faqItemSchema).min(1).max(20);

// Global announcement banner (ERP Quick Actions → Global Announcement).
// `active: false` hides it without deleting the content.
export const announcementSchema = z
  .object({
    title: textPair,
    message: textPair,
    tone: z.enum(['info', 'warn', 'critical']).optional(),
    active: z.boolean(),
  })
  .strict();

export const fxRatesSchema = z
  .object({
    USDT: z.string().trim().regex(/^\d+$/),
    AED: z.string().trim().regex(/^\d+$/),
    EUR: z.string().trim().regex(/^\d+$/),
  })
  .strict();

export const supportSectionSchema = z
  .object({
    title: textPair.partial().optional(),
    subtitle: textPair.partial().optional(),
    phone: z.string().trim().max(40).optional(),
    phoneDisplay: textPair.partial().optional(),
  })
  .strict();

export const SITE_CONTENT_SCHEMAS: Record<SiteContentKey, z.ZodTypeAny> = {
  'home.hero': heroSchema,
  'home.promos': promosSchema,
  'home.routes': routesSchema,
  'home.faq': faqSchema,
  'home.support': supportSectionSchema,
  'site.announcement': announcementSchema,
  'finance.fx_rates': fxRatesSchema,
};

export type HeroOverride = z.infer<typeof heroSchema>;
export type PromoBannerOverride = z.infer<typeof promoBannerSchema>;
export type PopularRouteOverride = z.infer<typeof popularRouteSchema>;
export type FaqItemOverride = z.infer<typeof faqItemSchema>;
export type AnnouncementOverride = z.infer<typeof announcementSchema>;
export type FxRatesOverride = z.infer<typeof fxRatesSchema>;
export type SupportOverride = z.infer<typeof supportSectionSchema>;

export interface SiteContentEntry {
  key: SiteContentKey;
  payload: unknown;
  updatedBy: string | null;
  updatedAt: Date;
}

class SiteContentService {
  /** Validates raw JSON against the key's schema; returns the parsed payload. */
  static parsePayload(key: SiteContentKey, raw: unknown): unknown {
    const result = SITE_CONTENT_SCHEMAS[key].safeParse(raw);
    if (!result.success) {
      const first = result.error.issues[0];
      throw new Error(`محتوای کلید «${key}» معتبر نیست: ${first?.path.join('.') || ''} ${first?.message || ''}`.trim());
    }
    return result.data;
  }

  /** Lists every stored override. Invalid rows are returned as-is for admin visibility. */
  static async list(): Promise<SiteContentEntry[]> {
    const rows = await prisma.siteContent.findMany({ orderBy: { key: 'asc' } });
    return rows.map((row) => {
      let payload: unknown = null;
      try {
        payload = JSON.parse(row.payload);
      } catch {
        payload = null;
      }
      return { key: row.key as SiteContentKey, payload, updatedBy: row.updatedBy, updatedAt: row.updatedAt };
    });
  }

  /** Returns the parsed payload stored for a key, or null when absent/invalid. */
  static async get<T>(key: SiteContentKey): Promise<T | null> {
    try {
      const row = await prisma.siteContent.findUnique({ where: { key } });
      if (!row) return null;
      const parsed = SITE_CONTENT_SCHEMAS[key].safeParse(JSON.parse(row.payload));
      return parsed.success ? (parsed.data as T) : null;
    } catch {
      return null;
    }
  }

  static async upsert(key: SiteContentKey, payload: unknown, updatedBy?: string): Promise<SiteContentEntry> {
    const valid = SiteContentService.parsePayload(key, payload);
    const row = await prisma.siteContent.upsert({
      where: { key },
      update: { payload: JSON.stringify(valid), updatedBy: updatedBy ?? null },
      create: { key, payload: JSON.stringify(valid), updatedBy: updatedBy ?? null },
    });
    return { key, payload: valid, updatedBy: row.updatedBy, updatedAt: row.updatedAt };
  }

  static async remove(key: SiteContentKey): Promise<void> {
    await prisma.siteContent.deleteMany({ where: { key } });
  }
}

export { SiteContentService };
