/**
 * Persian Travel Internal Link Graph & Auto-Linker for Firuzo Platform.
 * Adapted from aroux30/seo (internal_link_service.py).
 *
 * Automatically links destination mentions and travel services in travelogues and guides
 * to prevent orphan pages and boost organic SEO rankings:
 * - Persian text normalization (folds Arabic Yeh/Kaf, respects ZWNJ).
 * - Avoids double-linking (links each entity at most once per document).
 * - Skips text already enclosed in markdown links [text](url) or HTML tags.
 * - Enforces density limits to avoid spammy over-optimization.
 */

import { normalizePersianText } from "@/lib/iranian-commerce";

export interface TravelLinkTarget {
  keywords: string[];
  canonicalUrl: string;
  category: "destination" | "hotel" | "flight" | "service" | "tour";
  priority: number;
}

export interface AutoLinkResult {
  processedContent: string;
  insertedLinks: {
    anchorText: string;
    targetUrl: string;
    category: string;
  }[];
  unlinkedKeywords: string[];
}

export const DEFAULT_TRAVEL_TARGETS: TravelLinkTarget[] = [
  {
    keywords: ["استانبول", "سفر به استانبول"],
    canonicalUrl: "/destinations/istanbul",
    category: "destination",
    priority: 1,
  },
  {
    keywords: ["دبی", "سفر به دبی"],
    canonicalUrl: "/destinations/dubai",
    category: "destination",
    priority: 1,
  },
  {
    keywords: ["کیش", "جزیره کیش", "سفر به کیش"],
    canonicalUrl: "/destinations/kish",
    category: "destination",
    priority: 1,
  },
  {
    keywords: ["تفلیس", "سفر به گرجستان"],
    canonicalUrl: "/destinations/tbilisi",
    category: "destination",
    priority: 2,
  },
  {
    keywords: ["رزرو هتل", "هتل‌های"],
    canonicalUrl: "/hotels/search",
    category: "hotel",
    priority: 2,
  },
  {
    keywords: ["بلیط هواپیما", "خرید بلیط هواپیما", "پروازهای"],
    canonicalUrl: "/flights/search",
    category: "flight",
    priority: 2,
  },
  {
    keywords: ["تورهای مسافرتی", "رزرو تور"],
    canonicalUrl: "/tours",
    category: "tour",
    priority: 3,
  },
  {
    keywords: ["بیمه مسافرتی"],
    canonicalUrl: "/insurance",
    category: "service",
    priority: 4,
  },
  {
    keywords: ["سیم کارت بین‌المللی", "eSIM"],
    canonicalUrl: "/esim",
    category: "service",
    priority: 4,
  },
  {
    keywords: ["ترانسفر فرودگاهی"],
    canonicalUrl: "/transfers",
    category: "service",
    priority: 4,
  },
];

export class InternalLinkEngine {
  private targets: TravelLinkTarget[];

  constructor(customTargets?: TravelLinkTarget[]) {
    this.targets = (customTargets || DEFAULT_TRAVEL_TARGETS)
      .map((t) => ({
        ...t,
        keywords: [...t.keywords].sort((a, b) => b.length - a.length),
      }))
      .sort((a, b) => a.priority - b.priority);
  }

  /**
   * Scans markdown content and replaces unlinked travel entities with canonical markdown links.
   */
  processContent(
    content: string,
    options?: { maxLinks?: number; allowMultiplePerCategory?: boolean }
  ): AutoLinkResult {
    const maxLinks = options?.maxLinks ?? 6;
    const insertedLinks: AutoLinkResult["insertedLinks"] = [];
    const usedCategories = new Set<string>();
    const usedUrls = new Set<string>();
    const unlinkedKeywords: string[] = [];

    // Pre-extract protected zones (existing markdown links `[...](...)`, html tags, code blocks)
    // using matchAll (never using exec)
    const protectedRanges: { start: number; end: number }[] = [];

    // Match markdown links: [text](url)
    const mdMatches = Array.from(content.matchAll(/\[[^\]]+\]\([^)]+\)/g));
    for (const m of mdMatches) {
      if (m.index !== undefined) {
        protectedRanges.push({ start: m.index, end: m.index + m[0].length });
      }
    }

    // Match HTML tags: <a ...>...</a> or self-closing tags
    const htmlMatches = Array.from(content.matchAll(/<[^>]+>/g));
    for (const m of htmlMatches) {
      if (m.index !== undefined) {
        protectedRanges.push({ start: m.index, end: m.index + m[0].length });
      }
    }

    // Match headings: lines starting with #
    const headingMatches = Array.from(content.matchAll(/^#{1,6}\s+.*$/gm));
    for (const m of headingMatches) {
      if (m.index !== undefined) {
        protectedRanges.push({ start: m.index, end: m.index + m[0].length });
      }
    }

    const isInsideProtectedRange = (index: number, length: number): boolean => {
      const matchEnd = index + length;
      return protectedRanges.some(
        (range) =>
          (index >= range.start && index < range.end) ||
          (matchEnd > range.start && matchEnd <= range.end) ||
          (index <= range.start && matchEnd >= range.end)
      );
    };

    let result = content;

    for (const target of this.targets) {
      if (insertedLinks.length >= maxLinks) break;
      if (!options?.allowMultiplePerCategory && usedCategories.has(target.category)) {
        continue;
      }
      if (usedUrls.has(target.canonicalUrl)) {
        continue;
      }

      let matchedForThisTarget = false;

      for (const keyword of target.keywords) {
        if (matchedForThisTarget) break;

        const normKeyword = normalizePersianText(keyword);
        const normContent = normalizePersianText(result);

        const pos = normContent.indexOf(normKeyword);
        if (pos === -1) continue;

        // Check if this match falls in a protected range
        if (isInsideProtectedRange(pos, keyword.length)) {
          continue;
        }

        // Check word boundary in Persian/English
        const beforeChar = pos > 0 ? result[pos - 1] : " ";
        const afterChar = pos + keyword.length < result.length ? result[pos + keyword.length] : " ";
        const isWordBoundary =
          /[\s\n،؛.:!?()[\]{}"'«»\-]/.test(beforeChar) &&
          /[\s\n،؛.:!?()[\]{}"'«»\-]/.test(afterChar);

        if (!isWordBoundary) continue;

        const anchorText = result.slice(pos, pos + keyword.length);
        const replacement = `[${anchorText}](${target.canonicalUrl})`;

        result = result.slice(0, pos) + replacement + result.slice(pos + keyword.length);

        insertedLinks.push({
          anchorText,
          targetUrl: target.canonicalUrl,
          category: target.category,
        });

        usedCategories.add(target.category);
        usedUrls.add(target.canonicalUrl);
        matchedForThisTarget = true;
        break;
      }

      if (!matchedForThisTarget) {
        unlinkedKeywords.push(...target.keywords);
      }
    }

    return {
      processedContent: result,
      insertedLinks,
      unlinkedKeywords: Array.from(new Set(unlinkedKeywords)),
    };
  }
}

export const internalLinkEngine = new InternalLinkEngine();
