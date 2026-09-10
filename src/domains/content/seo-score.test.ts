import { describe, it, expect } from "vitest";
import {
  calculateSeoScore,
  extractWords,
  countPhraseOccurrences,
  SeoAuditInput,
} from "./seo-score";

describe("seo-score engine", () => {
  it("extracts words from markdown content correctly", () => {
    const md = "# راهنمای جامع سفر به دبی\n\nبرای [رزرو هتل دبی](https://firuzo.com/hotels) اینجا کلیک کنید.";
    const words = extractWords(md);
    expect(words).toContain("راهنمای");
    expect(words).toContain("دبی");
    expect(words).toContain("رزرو");
    expect(words).not.toContain("https");
  });

  it("counts phrase occurrences accurately with Persian normalization", () => {
    const text = "هتل‌های لوکس در دبی بسیار محبوب هستند. برای رزرو هتل دبی به سایت مراجعه کنید.";
    expect(countPhraseOccurrences(text, "هتل دبی")).toBe(1);
    expect(countPhraseOccurrences(text, "دبی")).toBe(2);
  });

  it("calculates a high score for a well-optimized Persian travel guide", () => {
    const highQualityArticle: SeoAuditInput = {
      title: "راهنمای سفر به استانبول؛ ۱۰ نکته طلایی برای اقامت و رزرو هتل",
      metaDescription: "کامل‌ترین راهنمای سفر به استانبول به همراه بررسی بهترین هتل‌ها و جاذبه‌های گردشگری برای سفری اقتصادی و لذت‌بخش.",
      slug: "istanbul-travel-guide-راهنمای-سفر-به-استانبول",
      focusKeyword: "سفر به استانبول",
      content: `
# راهنمای جامع سفر به استانبول

سفر به استانبول یکی از محبوب‌ترین مقاصد گردشگری برای مسافران ایرانی است. در این مقاله به بررسی هزینه‌ها، پروازها و نکات کلیدی می‌پردازیم.

## فهرست مطالب
- جاذبه‌های دیدنی
- بهترین هتل‌های استانبول
- نکات مهم در سفر به استانبول

## جاذبه‌های دیدنی و تاریخی
استانبول شهری با تلفیق فرهنگ شرق و غرب است. مسجد ایاصوفیه، کاخ توپکاپی و بازار بزرگ از مهم‌ترین دیدنی‌ها هستند.

![برترین جاذبه‌ها در سفر به استانبول](https://images.unsplash.com/photo-istanbul.jpg)

## بهترین هتل‌ها برای اقامت
برای انتخاب هتل، مناطق تکسیم و سلطان احمد گزینه‌های ایده‌آلی هستند. برای مشاهده قیمت‌ها و مقایسه به بخش [رزرو هتل در فیروزو](/hotels/search) مراجعه کنید. همچنین برای بررسی پروازها به [بلیط هواپیما](/flights/search) سر بزنید.

![اتاق‌های هتل در سفر به استانبول](https://images.unsplash.com/photo-room.jpg)

## نکات مهم در سفر به استانبول
استفاده از استانبول کارت برای حمل و نقل عمومی هزینه سفر به استانبول را به شدت کاهش می‌دهد. برای دریافت اطلاعات بیشتر درباره پروازهای بین‌المللی می‌توانید از [وب‌سایت رسمی ترکیش](https://www.turkishairlines.com) نیز دیدن فرمایید. همچنین نقشه مسیرها در [سایت شهرداری استانبول](https://www.ibb.istanbul) در دسترس است.

![نقشه مترو در سفر به استانبول](https://images.unsplash.com/photo-metro.jpg)
![نمای بسفر در سفر به استانبول](https://images.unsplash.com/photo-bosphorus.jpg)
      `.repeat(3), // multiply to increase word count
    };

    const report = calculateSeoScore(highQualityArticle);
    expect(report.totalScore).toBeGreaterThanOrEqual(80);
    expect(report.grade).toBe("excellent");
    expect(report.badgeColor).toBe("green");
    expect(report.rules.find((r) => r.ruleId === "keyword_in_title")?.passed).toBe(true);
    expect(report.rules.find((r) => r.ruleId === "keyword_in_meta_description")?.passed).toBe(true);
    expect(report.rules.find((r) => r.ruleId === "keyword_in_slug")?.passed).toBe(true);
    expect(report.rules.find((r) => r.ruleId === "numbers_in_title")?.passed).toBe(true);
    expect(report.rules.find((r) => r.ruleId === "keyword_in_image_alt")?.passed).toBe(true);
  });

  it("returns low score and actionable recommendations for unoptimized content", () => {
    const poorArticle: SeoAuditInput = {
      title: "خاطرات سفر من",
      metaDescription: "این یک یادداشت شخصی درباره تعطیلات است.",
      slug: "my-trip",
      focusKeyword: "تور کیش",
      content: "ما روز گذشته به سفر رفتیم و بسیار خوش گذشت.",
    };

    const report = calculateSeoScore(poorArticle);
    expect(report.totalScore).toBeLessThan(50);
    expect(report.grade).toBe("poor");
    expect(report.badgeColor).toBe("red");
    expect(report.recommendations.length).toBeGreaterThan(3);
    expect(report.recommendations).toContain("کلمه کلیدی هدف را در عنوان صفحه قرار دهید.");
  });
});
