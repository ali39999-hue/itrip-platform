import { describe, it, expect } from "vitest";
import { InternalLinkEngine } from "./InternalLinkEngine";

describe("InternalLinkEngine", () => {
  it("auto-links unlinked travel entities to their canonical URLs", () => {
    const engine = new InternalLinkEngine();
    const content =
      "سفر به استانبول یکی از خاطره‌انگیزترین تجربه‌هاست. برای اقامت بهتر است رزرو هتل را زودتر انجام دهید.";

    const result = engine.processContent(content);

    expect(result.insertedLinks.length).toBe(2);
    expect(result.insertedLinks[0].targetUrl).toBe("/destinations/istanbul");
    expect(result.insertedLinks[1].targetUrl).toBe("/hotels/search");
    expect(result.processedContent).toContain("[سفر به استانبول](/destinations/istanbul)");
    expect(result.processedContent).toContain("[رزرو هتل](/hotels/search)");
  });

  it("does not corrupt words already inside an existing markdown link", () => {
    const engine = new InternalLinkEngine();
    const content =
      "برای دیدن پکیج‌ها به [تورهای استانبول 1404](https://example.com/tour) مراجعه فرمایید.";

    const result = engine.processContent(content);

    // Should NOT insert another link inside the existing markdown link
    expect(result.processedContent).toBe(content);
    expect(result.insertedLinks.length).toBe(0);
  });

  it("does not insert links into markdown headings", () => {
    const engine = new InternalLinkEngine();
    const content = "# راهنمای سفر به استانبول\n\nشهری پر از شگفتی.";

    const result = engine.processContent(content);
    expect(result.processedContent.startsWith("# راهنمای سفر به استانبول")).toBe(true);
  });

  it("handles Arabic-Persian character normalization like دبي to دبی", () => {
    const engine = new InternalLinkEngine();
    const content = "سفر به دبي با بهترین پروازها.";

    const result = engine.processContent(content);
    expect(result.insertedLinks.length).toBe(1);
    expect(result.insertedLinks[0].targetUrl).toBe("/destinations/dubai");
    expect(result.processedContent).toContain("[سفر به دبي](/destinations/dubai)");
  });

  it("enforces maxLinks limit", () => {
    const engine = new InternalLinkEngine();
    const content =
      "سفر به استانبول و سفر به دبی و سفر به کیش و رزرو هتل و خرید بلیط هواپیما و بیمه مسافرتی عالی است.";

    const result = engine.processContent(content, { maxLinks: 2 });
    expect(result.insertedLinks.length).toBe(2);
  });
});
