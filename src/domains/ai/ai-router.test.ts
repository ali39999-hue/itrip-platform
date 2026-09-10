import { describe, it, expect, vi } from "vitest";
import { AiRouterService, AiProviderConfig } from "./AiRouterService";

describe("AiRouterService", () => {
  it("sorts providers by priority", () => {
    const router = new AiRouterService();
    const providers = router.getAvailableProviders();

    expect(providers[0].id).toBe("gemini");
    expect(providers[1].id).toBe("deepseek");
    expect(providers[2].id).toBe("openai");
    expect(providers[3].id).toBe("claude");
  });

  it("completes successfully using primary provider", async () => {
    const router = new AiRouterService();
    const mockHandler = vi.fn().mockResolvedValue({
      content: "برنامه سفر ۳ روزه به اصفهان",
      model: "gemini-2.0-flash",
    });

    router.registerHandler("gemini", mockHandler);

    const res = await router.generateCompletion({ prompt: "برنامه سفر اصفهان" });
    expect(res.content).toBe("برنامه سفر ۳ روزه به اصفهان");
    expect(res.provider).toBe("gemini");
    expect(res.model).toBe("gemini-2.0-flash");
    expect(mockHandler).toHaveBeenCalledTimes(1);
  });

  it("automatically fails over to secondary provider when primary returns HTTP 429", async () => {
    const router = new AiRouterService();

    // Primary Gemini throws 429 Rate Limit
    const geminiMock = vi.fn().mockRejectedValue(new Error("HTTP 429: Too Many Requests - Quota Exceeded"));

    // Secondary DeepSeek succeeds
    const deepseekMock = vi.fn().mockResolvedValue({
      content: "پاسخ از دیپ‌سیک",
      model: "deepseek-chat",
    });

    router.registerHandler("gemini", geminiMock);
    router.registerHandler("deepseek", deepseekMock);

    const res = await router.generateCompletion({ prompt: "هتل‌های کیش" });

    expect(res.content).toBe("پاسخ از دیپ‌سیک");
    expect(res.provider).toBe("deepseek");

    // Gemini should now be in cooldown
    expect(router.isProviderCoolingDown("gemini")).toBe(true);

    // Next call should skip Gemini directly
    const available = router.getAvailableProviders();
    expect(available[0].id).toBe("deepseek");
  });

  it("throws descriptive error when all providers fail", async () => {
    const customConfig: AiProviderConfig[] = [
      { id: "gemini", name: "G", defaultModel: "g", priority: 1 },
      { id: "openai", name: "O", defaultModel: "o", priority: 2 },
    ];

    const router = new AiRouterService(customConfig);
    router.registerHandler("gemini", vi.fn().mockRejectedValue(new Error("Network Down")));
    router.registerHandler("openai", vi.fn().mockRejectedValue(new Error("Authentication Failure")));

    await expect(router.generateCompletion({ prompt: "تست" })).rejects.toThrow(/All AI providers failed/);
  });

  it("respects preferredProvider override if available", async () => {
    const router = new AiRouterService();
    const claudeMock = vi.fn().mockResolvedValue({
      content: "پاسخ از کلود",
      model: "claude-3-5-haiku",
    });

    router.registerHandler("claude", claudeMock);

    const res = await router.generateCompletion(
      { prompt: "راهنمای سفر" },
      { preferredProvider: "claude" }
    );

    expect(res.provider).toBe("claude");
    expect(claudeMock).toHaveBeenCalledTimes(1);
  });
});
