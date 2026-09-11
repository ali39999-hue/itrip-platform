import { describe, it, expect, vi } from "vitest";
import { AiRouterService, AiProviderConfig, IAiHealthStore, AiProviderId } from "./AiRouterService";

describe("AiRouterService (Production Hardened)", () => {
  it("sorts providers by priority", async () => {
    const router = new AiRouterService();
    const providers = await router.getAvailableProviders();

    expect(providers[0].id).toBe("gemini");
    expect(providers[1].id).toBe("deepseek");
    expect(providers[2].id).toBe("openai");
    expect(providers[3].id).toBe("claude");
  });

  it("completes successfully using primary provider and attaches Product Truth disclaimer", async () => {
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

    // Section 30 Product truth assertion
    expect(res.isAiEstimate).toBe(true);
    expect(res.disclaimer.fa).toContain("توسط هوش مصنوعی تولید شده");
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
    expect(await router.isProviderCoolingDown("gemini")).toBe(true);

    // Next call should skip Gemini directly
    const available = await router.getAvailableProviders();
    expect(available[0].id).toBe("deepseek");
  });

  it("supports shared multi-instance health store (Section 29)", async () => {
    const sharedCooldowns = new Set<string>();

    const mockDistributedStore: IAiHealthStore = {
      isCoolingDown: (id: AiProviderId) => sharedCooldowns.has(id),
      triggerCooldown: (id: AiProviderId) => {
        sharedCooldowns.add(id);
      },
      reset: () => {
        sharedCooldowns.clear();
      },
    };

    const instanceA = new AiRouterService(undefined, mockDistributedStore);
    const instanceB = new AiRouterService(undefined, mockDistributedStore);

    // Instance A marks Gemini down
    await instanceA.triggerCooldown("gemini", 60000);

    // Instance B sees Gemini as cooling down immediately via shared store
    expect(await instanceB.isProviderCoolingDown("gemini")).toBe(true);
    const bProviders = await instanceB.getAvailableProviders();
    expect(bProviders[0].id).toBe("deepseek");
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
