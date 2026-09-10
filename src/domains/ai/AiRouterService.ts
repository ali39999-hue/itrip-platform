/**
 * Multi-Provider AI Router with Automated 429 Failover for Firuzo Platform.
 * Adapted from aroux30/seo (ai_router.py).
 *
 * Provides high-availability LLM completions for travel itinerary planning,
 * content generation, and ERP copilot services:
 * - Priority-ordered provider failover (Gemini -> DeepSeek -> OpenAI -> Claude).
 * - Automatic detection of rate limits (HTTP 429) and network failures with instant fallback.
 * - 10-minute cooldown on degraded providers.
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
}

export type ProviderHandler = (
  req: AiCompletionRequest,
  config: AiProviderConfig,
  signal?: AbortSignal
) => Promise<{ content: string; model: string }>;

export class AiRouterService {
  private providers: Map<AiProviderId, AiProviderConfig> = new Map();
  private cooldowns: Map<AiProviderId, number> = new Map();
  private handlers: Map<AiProviderId, ProviderHandler> = new Map();
  private defaultCooldownMs = 10 * 60 * 1000; // 10 minutes

  constructor(customProviders?: AiProviderConfig[]) {
    this.initDefaultProviders();
    if (customProviders) {
      for (const p of customProviders) {
        this.registerProvider(p);
      }
    }
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

  isProviderCoolingDown(id: AiProviderId): boolean {
    const until = this.cooldowns.get(id);
    if (!until) return false;
    if (Date.now() >= until) {
      this.cooldowns.delete(id);
      return false;
    }
    return true;
  }

  triggerCooldown(id: AiProviderId, durationMs?: number) {
    const duration = durationMs ?? this.providers.get(id)?.cooldownMs ?? this.defaultCooldownMs;
    this.cooldowns.set(id, Date.now() + duration);
  }

  resetCooldowns() {
    this.cooldowns.clear();
  }

  getAvailableProviders(): AiProviderConfig[] {
    const list = Array.from(this.providers.values());
    return list
      .filter((p) => !this.isProviderCoolingDown(p.id))
      .sort((a, b) => a.priority - b.priority);
  }

  /**
   * Executes completion through the highest priority healthy provider with automated failover.
   */
  async generateCompletion(
    req: AiCompletionRequest,
    options?: { timeoutMs?: number; preferredProvider?: AiProviderId }
  ): Promise<AiCompletionResponse> {
    const available = this.getAvailableProviders();

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
          this.triggerCooldown(provider.id);
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
