/**
 * Deterministic Persian SEO Scoring Engine for Firuzo Platform.
 * Adapted from aroux30/seo (Rank Math 100/100 rules with Persian adaptations).
 *
 * Evaluates travel articles, destination guides, and hotel pages on a 100-point scale:
 * - Basic SEO (45 pts)
 * - Additional SEO (35 pts)
 * - Title Readability (10 pts)
 * - Content Readability (10 pts)
 */

import { normalizePersianText, toAsciiDigits } from "@/lib/iranian-commerce";

export interface SeoAuditInput {
  title: string;
  metaDescription: string;
  slug: string;
  content: string; // Markdown or HTML
  focusKeyword: string;
}

export interface SeoRuleResult {
  ruleId: string;
  title: string;
  category: "basic" | "additional" | "title_readability" | "content_readability";
  score: number;
  maxScore: number;
  passed: boolean;
  message: string;
}

export type SeoGrade = "excellent" | "good" | "needs_improvement" | "poor";

export interface SeoAuditReport {
  totalScore: number;
  maxScore: 100;
  grade: SeoGrade;
  badgeColor: "green" | "yellow" | "orange" | "red";
  wordCount: number;
  keywordDensity: number;
  rules: SeoRuleResult[];
  recommendations: string[];
}

/**
 * Extracts plain words from markdown or HTML content, handling Persian characters and ZWNJ.
 */
export function extractWords(content: string): string[] {
  if (!content) return [];
  const stripped = content
    .replace(/<[^>]+>/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#*_~`>+\-]/g, " ");

  const normalized = normalizePersianText(stripped);
  const tokens = normalized.match(/[\p{Letter}\p{Number}]+/gu) || [];
  return tokens.map((t) => t.toLowerCase());
}

/**
 * Counts occurrences of a phrase in text (case-insensitive and Persian-normalized).
 */
export function countPhraseOccurrences(haystack: string, needle: string): number {
  if (!haystack || !needle) return 0;
  const normHaystack = normalizePersianText(haystack).toLowerCase();
  const normNeedle = normalizePersianText(needle).toLowerCase();

  let count = 0;
  let pos = 0;
  while ((pos = normHaystack.indexOf(normNeedle, pos)) !== -1) {
    count++;
    pos += normNeedle.length;
  }
  return count;
}

/**
 * Analyzes content and computes the 100-point deterministic Rank Math score.
 */
export function calculateSeoScore(input: SeoAuditInput): SeoAuditReport {
  const { title, metaDescription, slug, content, focusKeyword } = input;
  const rules: SeoRuleResult[] = [];
  const recommendations: string[] = [];

  const normKeyword = normalizePersianText(focusKeyword).trim().toLowerCase();
  const words = extractWords(content);
  const wordCount = words.length;

  const keywordWordCount = extractWords(focusKeyword).length || 1;
  const keywordOccurrences = countPhraseOccurrences(content, focusKeyword);
  const keywordDensity = wordCount > 0 ? (keywordOccurrences * keywordWordCount * 100) / wordCount : 0;

  // ───────────────────────────────────────────────────────────────────────────
  // CATEGORY 1: BASIC SEO (45 points)
  // ───────────────────────────────────────────────────────────────────────────

  // 1. Keyword in Title (10 pts)
  const hasKeywordInTitle = countPhraseOccurrences(title, focusKeyword) > 0;
  rules.push({
    ruleId: "keyword_in_title",
    title: "کلمه کلیدی در عنوان سئو",
    category: "basic",
    score: hasKeywordInTitle ? 10 : 0,
    maxScore: 10,
    passed: hasKeywordInTitle,
    message: hasKeywordInTitle
      ? "کلمه کلیدی هدف در عنوان صفحه قرار دارد."
      : "کلمه کلیدی هدف در عنوان صفحه یافت نشد.",
  });
  if (!hasKeywordInTitle) recommendations.push("کلمه کلیدی هدف را در عنوان صفحه قرار دهید.");

  // 2. Keyword in Meta Description (10 pts)
  const hasKeywordInMeta = countPhraseOccurrences(metaDescription, focusKeyword) > 0;
  rules.push({
    ruleId: "keyword_in_meta_description",
    title: "کلمه کلیدی در توضیحات متا",
    category: "basic",
    score: hasKeywordInMeta ? 10 : 0,
    maxScore: 10,
    passed: hasKeywordInMeta,
    message: hasKeywordInMeta
      ? "کلمه کلیدی در توضیحات متای صفحه درج شده است."
      : "کلمه کلیدی در توضیحات متای صفحه وجود ندارد.",
  });
  if (!hasKeywordInMeta) recommendations.push("کلمه کلیدی را در توضیحات متا (Meta Description) اضافه کنید.");

  // 3. Keyword in Slug / URL (5 pts)
  const normSlug = decodeURIComponent(toAsciiDigits(slug || "")).toLowerCase();
  const slugKeywordMatch = normSlug.includes(normKeyword.replace(/\s+/g, "-")) || normSlug.includes(normKeyword);
  rules.push({
    ruleId: "keyword_in_slug",
    title: "کلمه کلیدی در آدرس صفحه (Slug)",
    category: "basic",
    score: slugKeywordMatch ? 5 : 0,
    maxScore: 5,
    passed: slugKeywordMatch,
    message: slugKeywordMatch
      ? "کلمه کلیدی در آدرس صفحه (URL Slug) لحاظ شده است."
      : "کلمه کلیدی در آدرس اینترنتی صفحه قرار ندارد.",
  });
  if (!slugKeywordMatch) recommendations.push("کلمه کلیدی هدف را در پیوند یکتا (Slug) لحاظ کنید.");

  // 4. Keyword in first 10% of content (10 pts)
  const first10PercentLength = Math.max(Math.floor(content.length * 0.1), 120);
  const first10Percent = content.slice(0, first10PercentLength);
  const hasKeywordInStart = countPhraseOccurrences(first10Percent, focusKeyword) > 0;
  rules.push({
    ruleId: "keyword_in_first_10_percent",
    title: "کلمه کلیدی در ۱۰٪ ابتدای متن",
    category: "basic",
    score: hasKeywordInStart ? 10 : 0,
    maxScore: 10,
    passed: hasKeywordInStart,
    message: hasKeywordInStart
      ? "کلمه کلیدی در پاراگراف‌های آغازین متن حضور دارد."
      : "کلمه کلیدی در ۱۰ درصد ابتدایی محتوا مشاهده نشد.",
  });
  if (!hasKeywordInStart) recommendations.push("کلمه کلیدی را در پاراگراف مقدمه یا ۱۰٪ اول متن بگنجانید.");

  // 5. Keyword in content body (5 pts)
  const hasKeywordInBody = keywordOccurrences > 0;
  rules.push({
    ruleId: "keyword_in_content",
    title: "حضور کلمه کلیدی در متن",
    category: "basic",
    score: hasKeywordInBody ? 5 : 0,
    maxScore: 5,
    passed: hasKeywordInBody,
    message: hasKeywordInBody
      ? `کلمه کلیدی ${keywordOccurrences} بار در محتوا تکرار شده است.`
      : "کلمه کلیدی در متن مقاله وجود ندارد.",
  });
  if (!hasKeywordInBody) recommendations.push("کلمه کلیدی هدف را در بدنه محتوا به کار ببرید.");

  // 6. Content Length / Word Count (5 pts)
  let wordCountScore = 1;
  if (wordCount >= 2500) wordCountScore = 5;
  else if (wordCount >= 1000) wordCountScore = 4;
  else if (wordCount >= 600) wordCountScore = 3;
  else if (wordCount >= 300) wordCountScore = 2;

  rules.push({
    ruleId: "content_length",
    title: "طول و جامعیت محتوا",
    category: "basic",
    score: wordCountScore,
    maxScore: 5,
    passed: wordCountScore >= 4,
    message: `تعداد کلمات محتوا: ${wordCount} کلمه.`,
  });
  if (wordCount < 600) recommendations.push("طول محتوا کم است؛ برای رتبه‌گیری بهتر متن را به حداقل ۶۰۰ کلمه برسانید.");

  // ───────────────────────────────────────────────────────────────────────────
  // CATEGORY 2: ADDITIONAL SEO (35 points)
  // ───────────────────────────────────────────────────────────────────────────

  // 7. Keyword in subheadings H2/H3 (5 pts)
  const headingMatches = content.match(/^(?:#{2,4}\s+|.*<h[2-4][^>]*>)(.*?)(?:<\/h[2-4]>|$)/gim) || [];
  const hasKeywordInHeadings = headingMatches.some((h) => countPhraseOccurrences(h, focusKeyword) > 0);
  rules.push({
    ruleId: "keyword_in_subheadings",
    title: "کلمه کلیدی در تیترهای فرعی (H2/H3)",
    category: "additional",
    score: hasKeywordInHeadings ? 5 : 0,
    maxScore: 5,
    passed: hasKeywordInHeadings,
    message: hasKeywordInHeadings
      ? "کلمه کلیدی در تیترهای فرعی متن به کار رفته است."
      : "کلمه کلیدی در هیچ‌یک از تیترهای H2 یا H3 یافت نشد.",
  });
  if (!hasKeywordInHeadings) recommendations.push("حداقل در یکی از تیترهای H2 یا H3 از کلمه کلیدی استفاده کنید.");

  // 8. Keyword in image alt attribute (10 pts)
  const imageMarkdownMatches = Array.from(content.matchAll(/!\[([^\]]*)\]\([^)]+\)/g));
  const imageHtmlMatches = Array.from(content.matchAll(/<img[^>]+alt=["']([^"']*)["']/gi));
  const allImages = [...imageMarkdownMatches, ...imageHtmlMatches];
  const imageCount = allImages.length;
  const hasImageWithAltKeyword = allImages.some((m) => {
    const alt = m[1] ?? "";
    return countPhraseOccurrences(alt, focusKeyword) > 0;
  });

  rules.push({
    ruleId: "keyword_in_image_alt",
    title: "کلمه کلیدی در ویژگی Alt تصاویر",
    category: "additional",
    score: hasImageWithAltKeyword ? 10 : 0,
    maxScore: 10,
    passed: hasImageWithAltKeyword,
    message: hasImageWithAltKeyword
      ? "کلمه کلیدی در ویژگی متن جایگزین (Alt) تصاویر درج شده است."
      : "متن جایگزین (Alt) تصاویر شامل کلمه کلیدی هدف نیست یا تصویری وجود ندارد.",
  });
  if (!hasImageWithAltKeyword) recommendations.push("کلمه کلیدی را در متن جایگزین (Alt) حداقل یک تصویر قرار دهید.");

  // 9. Keyword Density (10 pts)
  let densityScore = 0;
  if (keywordDensity >= 1.0 && keywordDensity <= 1.5) {
    densityScore = 10;
  } else if ((keywordDensity >= 0.8 && keywordDensity < 1.0) || (keywordDensity > 1.5 && keywordDensity <= 2.0)) {
    densityScore = 7;
  } else if ((keywordDensity >= 0.5 && keywordDensity < 0.8) || (keywordDensity > 2.0 && keywordDensity <= 2.5)) {
    densityScore = 4;
  }

  rules.push({
    ruleId: "keyword_density",
    title: "چگالی بهینه کلمه کلیدی",
    category: "additional",
    score: densityScore,
    maxScore: 10,
    passed: densityScore >= 7,
    message: `چگالی کلمه کلیدی: ${keywordDensity.toFixed(2)}% (محدوده ایده‌آل: ۱ تا ۱.۵٪).`,
  });
  if (keywordDensity < 0.8) recommendations.push("چگالی کلمه کلیدی پایین است؛ کلمه کلیدی را در بخش‌های بیشتری تکرار کنید.");
  if (keywordDensity > 2.0) recommendations.push("چگالی کلمه کلیدی بالا است (خطر Over-Optimization). تکرار آن را تعدیل کنید.");

  // 10. External Links (5 pts)
  const externalLinkMatches = Array.from(content.matchAll(/\[([^\]]+)\]\((https?:\/\/(?!firuzo\.com|itrip\.ir)[^\s)]+)\)/gi));
  const externalLinksCount = externalLinkMatches.length;
  const extScore = externalLinksCount >= 2 ? 5 : externalLinksCount === 1 ? 3 : 0;
  rules.push({
    ruleId: "external_links",
    title: "پیوندهای خارجی معتبر",
    category: "additional",
    score: extScore,
    maxScore: 5,
    passed: extScore >= 3,
    message: `تعداد لینک‌های خارجی: ${externalLinksCount} پیوند.`,
  });
  if (externalLinksCount < 2) recommendations.push("به منابع معتبر بیرونی (سایت‌های رسمی گردشگری، مقالات مرجع) لینک دهید.");

  // 11. Internal Links (5 pts)
  const internalLinkMatches = Array.from(content.matchAll(/\[([^\]]+)\]\((\/[^\s)]+|https?:\/\/(?:firuzo\.com|itrip\.ir)[^\s)]*)\)/gi));
  const internalLinksCount = internalLinkMatches.length;
  const intScore = internalLinksCount >= 2 ? 5 : internalLinksCount === 1 ? 3 : 0;
  rules.push({
    ruleId: "internal_links",
    title: "پیوندهای داخلی به بخش‌های سایت",
    category: "additional",
    score: intScore,
    maxScore: 5,
    passed: intScore >= 3,
    message: `تعداد لینک‌های داخلی: ${internalLinksCount} پیوند.`,
  });
  if (internalLinksCount < 2) recommendations.push("به صفحات دیگر سایت (هتل‌ها، پروازها، سایر مقاصد) لینک داخلی دهید.");

  // ───────────────────────────────────────────────────────────────────────────
  // CATEGORY 3: TITLE READABILITY (10 points)
  // ───────────────────────────────────────────────────────────────────────────

  // 12. Keyword at start of title (5 pts)
  const normTitle = normalizePersianText(title).toLowerCase();
  const keywordPos = normTitle.indexOf(normKeyword);
  const isKeywordAtStart = keywordPos >= 0 && keywordPos <= Math.floor(normTitle.length * 0.5);
  rules.push({
    ruleId: "keyword_at_start_of_title",
    title: "قرارگیری کلمه کلیدی در ابتدای عنوان",
    category: "title_readability",
    score: isKeywordAtStart ? 5 : 0,
    maxScore: 5,
    passed: isKeywordAtStart,
    message: isKeywordAtStart
      ? "کلمه کلیدی در نیمه ابتدایی عنوان قرار دارد."
      : "کلمه کلیدی در بخش انتهایی عنوان قرار گرفته است.",
  });
  if (!isKeywordAtStart) recommendations.push("کلمه کلیدی را به ابتدای عنوان نزدیک‌تر کنید.");

  // 13. Numbers in Title (5 pts)
  const hasNumbersInTitle =
    /[0-9۰-۹]/.test(title) ||
    /صفر تا صد|۰ تا ۱۰۰|برترین|بهترین|ارزان‌ترین|راهنمای جامع/.test(title);
  rules.push({
    ruleId: "numbers_in_title",
    title: "جذابیت عنوان با ارقام یا صفات برتر",
    category: "title_readability",
    score: hasNumbersInTitle ? 5 : 0,
    maxScore: 5,
    passed: hasNumbersInTitle,
    message: hasNumbersInTitle
      ? "عنوان شامل عدد یا عبارات جذب‌کننده کلیک است."
      : "استفاده از اعداد (مثلاً «۱۰ هتل برتر») باعث افزایش نرخ کلیک (CTR) می‌شود.",
  });
  if (!hasNumbersInTitle) recommendations.push("از اعداد یا عبارات آماری (مانند «۷ جاذبه برتر») در عنوان استفاده کنید.");

  // ───────────────────────────────────────────────────────────────────────────
  // CATEGORY 4: CONTENT READABILITY (10 points)
  // ───────────────────────────────────────────────────────────────────────────

  // 14. Table of contents or strong structure (5 pts)
  const hasTocOrStructure =
    /فهرست مطالب|table-of-contents|#\s*فهرست/i.test(content) || headingMatches.length >= 3;
  rules.push({
    ruleId: "table_of_contents_or_structure",
    title: "ساختار منظم و فهرست مطالب",
    category: "content_readability",
    score: hasTocOrStructure ? 5 : 0,
    maxScore: 5,
    passed: hasTocOrStructure,
    message: hasTocOrStructure
      ? "محتوا دارای ساختاربندی منظم با تیترهای متعدد است."
      : "محتوا فاقد ساختاربندی تیتری مناسب یا فهرست مطالب است.",
  });
  if (!hasTocOrStructure) recommendations.push("حداقل ۳ تیتر فرعی H2 یا بخش فهرست مطالب به متن بیفزایید.");

  // 15. Media Presence (5 pts)
  let mediaScore = 0;
  if (imageCount >= 4) mediaScore = 5;
  else if (imageCount >= 2) mediaScore = 3;
  else if (imageCount >= 1) mediaScore = 2;

  rules.push({
    ruleId: "media_presence",
    title: "تنوع چندرسانه‌ای (تصاویر و نمودارها)",
    category: "content_readability",
    score: mediaScore,
    maxScore: 5,
    passed: mediaScore >= 3,
    message: `تعداد تصاویر متن: ${imageCount} عدد.`,
  });
  if (imageCount < 2) recommendations.push("حداقل از ۲ تا ۴ تصویر مرتبط با کیفیت در متن استفاده کنید.");

  // ───────────────────────────────────────────────────────────────────────────
  // AGGREGATION & GRADING
  // ───────────────────────────────────────────────────────────────────────────

  const totalScore = rules.reduce((sum, r) => sum + r.score, 0);

  let grade: SeoGrade = "poor";
  let badgeColor: "green" | "yellow" | "orange" | "red" = "red";

  if (totalScore >= 80) {
    grade = "excellent";
    badgeColor = "green";
  } else if (totalScore >= 65) {
    grade = "good";
    badgeColor = "yellow";
  } else if (totalScore >= 50) {
    grade = "needs_improvement";
    badgeColor = "orange";
  }

  return {
    totalScore,
    maxScore: 100,
    grade,
    badgeColor,
    wordCount,
    keywordDensity,
    rules,
    recommendations,
  };
}
