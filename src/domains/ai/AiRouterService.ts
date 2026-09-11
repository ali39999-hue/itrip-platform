/**
 * Multi-Provider AI Router with Automated 429 Failover & Shared Health for Firuzo Platform.
 * Adapted from aroux30/seo (ai_router.py).
 * Hardened per Production Guidelines Section 28, 29 & 30 (SHARED HEALTH & PRODUCT TRUTH).
 *
 * Provides high-availability LLM completions for travel itinerary planning,
 * content generation, and ERP copilot services:
 * - Priority-ordered provider failover (Gemini -> DeepSeek -> OpenAI -> Claude).
 * - Automatic detection of rate limits (HTTP 429) and network failures with instant fallback.
 * - Distributed/Shared health store capability (multi-instance/Redis ready, no isolated Map).
 * - Strict Product Truth distinction (isAiEstimate: true with dual-language disclaimer).
 * - Latency tracking and SSRF-safe outbound fetch handling.
 */

import { safeFetch } from "@/lib/security/ssrf-protection";

export type AiProviderId = "gemini" | "deepseek" | "openai" | "claude";

export interface AiProviderConfig {
  id: AiProviderId;
  name: string;
  defaultModel: string;
  priority: number; // Lower number = higher priority
  apiKey?: string;
  endpoint?: string;
  cooldownMs?: number;
}

export interface AiCompletionRequest {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

export interface AiCompletionResponse {
  content: string;
  provider: AiProviderId;
  model: string;
  latencyMs: number;
  isAiEstimate: true; // Section 30: Product truth explicit separation
  disclaimer: {
    fa: string;
    en: string;
  };
}

export type ProviderHandler = (
  req: AiCompletionRequest,
  config: AiProviderConfig,
  signal?: AbortSignal
) => Promise<{ content: string; model: string }>;

/**
 * Shared Health Store Interface (Section 29: AI ROUTER SHARED HEALTH)
 * Allows multi-instance/distributed state synchronization (e.g. Redis)
 * rather than relying exclusively on an isolated in-memory Map.
 */
export interface IAiHealthStore {
  isCoolingDown(providerId: AiProviderId): Promise<boolean> | boolean;
  triggerCooldown(providerId: AiProviderId, durationMs: number): Promise<void> | void;
  reset(): Promise<void> | void;
}

export class InMemoryAiHealthStore implements IAiHealthStore {
  private cooldowns: Map<AiProviderId, number> = new Map();

  isCoolingDown(providerId: AiProviderId): boolean {
    const until = this.cooldowns.get(providerId);
    if (!until) return false;
    if (Date.now() >= until) {
      this.cooldowns.delete(providerId);
      return false;
    }
    return true;
  }

  triggerCooldown(providerId: AiProviderId, durationMs: number): void {
    this.cooldowns.set(providerId, Date.now() + durationMs);
  }

  reset(): void {
    this.cooldowns.clear();
  }
}

export class AiRouterService {
  private providers: Map<AiProviderId, AiProviderConfig> = new Map();
  private handlers: Map<AiProviderId, ProviderHandler> = new Map();
  private healthStore: IAiHealthStore;
  private defaultCooldownMs = 10 * 60 * 1000; // 10 minutes

  constructor(customProviders?: AiProviderConfig[], healthStore?: IAiHealthStore) {
    this.healthStore = healthStore || new InMemoryAiHealthStore();
    this.initDefaultProviders();
    if (customProviders) {
      for (const p of customProviders) {
        this.registerProvider(p);
      }
    }
  }

  setHealthStore(store: IAiHealthStore) {
    this.healthStore = store;
  }

  getHealthStore(): IAiHealthStore {
    return this.healthStore;
  }

  private initDefaultProviders() {
    this.registerProvider({
      id: "gemini",
      name: "Google Gemini",
      defaultModel: "gemini-2.0-flash",
      priority: 1,
      apiKey: process.env.GEMINI_API_KEY,
    });

    this.registerProvider({
      id: "deepseek",
      name: "DeepSeek AI",
      defaultModel: "deepseek-chat",
      priority: 2,
      apiKey: process.env.DEEPSEEK_API_KEY,
    });

    this.registerProvider({
      id: "openai",
      name: "OpenAI GPT-4o-mini",
      defaultModel: "gpt-4o-mini",
      priority: 3,
      apiKey: process.env.OPENAI_API_KEY,
    });

    this.registerProvider({
      id: "claude",
      name: "Anthropic Claude 3.5 Haiku",
      defaultModel: "claude-3-5-haiku-latest",
      priority: 4,
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  registerProvider(config: AiProviderConfig) {
    this.providers.set(config.id, config);
  }

  registerHandler(providerId: AiProviderId, handler: ProviderHandler) {
    this.handlers.set(providerId, handler);
  }

  async isProviderCoolingDown(id: AiProviderId): Promise<boolean> {
    return Boolean(await this.healthStore.isCoolingDown(id));
  }

  async triggerCooldown(id: AiProviderId, durationMs?: number): Promise<void> {
    const duration = durationMs ?? this.providers.get(id)?.cooldownMs ?? this.defaultCooldownMs;
    await this.healthStore.triggerCooldown(id, duration);
  }

  async resetCooldowns(): Promise<void> {
    await this.healthStore.reset();
  }

  async getAvailableProviders(): Promise<AiProviderConfig[]> {
    const list = Array.from(this.providers.values());
    const available: AiProviderConfig[] = [];
    for (const p of list) {
      const coolingDown = await this.isProviderCoolingDown(p.id);
      if (!coolingDown) {
        available.push(p);
      }
    }
    return available.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Executes completion through the highest priority healthy provider with automated failover.
   * Attaches explicit Product Truth disclaimers (Section 30).
   */
  async generateCompletion(
    req: AiCompletionRequest,
    options?: { timeoutMs?: number; preferredProvider?: AiProviderId }
  ): Promise<AiCompletionResponse> {
    const available = await this.getAvailableProviders();

    // If a preferred provider is specified and healthy, promote it to front
    if (options?.preferredProvider) {
      const idx = available.findIndex((p) => p.id === options.preferredProvider);
      if (idx > 0) {
        const [preferred] = available.splice(idx, 1);
        if (preferred) available.unshift(preferred);
      }
    }

    if (available.length === 0) {
      throw new Error("All AI providers are currently in cooldown or unconfigured.");
    }

    const errors: string[] = [];

    for (const provider of available) {
      const startTime = Date.now();
      try {
        const handler = this.handlers.get(provider.id) || this.defaultHttpHandler.bind(this);
        const timeout = options?.timeoutMs ?? 15000;
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);

        try {
          const result = await handler(req, provider, controller.signal);
          clearTimeout(timer);
          return {
            content: result.content,
            provider: provider.id,
            model: result.model,
            latencyMs: Date.now() - startTime,
            isAiEstimate: true,
            disclaimer: {
              fa: "این محتوا و برآوردها توسط هوش مصنوعی تولید شده و قیمت نهایی و ظرفیت قطعی در مرحله صدور نهایی تثبیت می‌گردد.",
              en: "This content is an AI-generated suggestion. Guaranteed pricing and inventory are confirmed upon final booking issuance.",
            },
          };
        } finally {
          clearTimeout(timer);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`[${provider.name}]: ${message}`);

        // If rate limit (429) or server error (5xx) or timeout, mark for cooldown
        const isRateLimit = message.includes("429") || message.toLowerCase().includes("rate limit") || message.includes("RESOURCE_EXHAUSTED");
        const isTimeout = message.toLowerCase().includes("timeout") || message.toLowerCase().includes("abort");

        if (isRateLimit || isTimeout) {
          await this.triggerCooldown(provider.id);
        }
        // Continue loop to failover to next provider
      }
    }

    throw new Error(`All AI providers failed. Errors:\n${errors.join("\n")}`);
  }

  /**
   * Default HTTP transport for standard AI completions with SSRF protection.
   */
  private async defaultHttpHandler(
    req: AiCompletionRequest,
    config: AiProviderConfig,
    signal?: AbortSignal
  ): Promise<{ content: string; model: string }> {
    if (!config.apiKey) {
      throw new Error(`API key for ${config.name} is not configured.`);
    }

    // OpenAI-compatible endpoint handler
    const endpoint = config.endpoint || "https://api.openai.com/v1/chat/completions";
    const messages = [];
    if (req.systemPrompt) {
      messages.push({ role: "system", content: req.systemPrompt });
    }
    messages.push({ role: "user", content: req.prompt });

    const response = await safeFetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.defaultModel,
        messages,
        temperature: req.temperature ?? 0.7,
        max_tokens: req.maxTokens ?? 1024,
        response_format: req.jsonMode ? { type: "json_object" } : undefined,
      }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    return {
      content,
      model: config.defaultModel,
    };
  }
}

export const aiRouter = new AiRouterService();
