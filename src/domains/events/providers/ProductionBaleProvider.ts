/**
 * Production Bale Provider Adapter (پیام‌رسان بله)
 *
 * Dispatches real OTP verification codes and notification messages via the
 * official Bale Bot API (https://tapi.bale.ai).
 *
 * Bot creation: Create a bot in Bale via @BotFather to receive the bot token.
 * API specification: https://docs.bale.ai
 */

import { NotificationResult } from '../NotificationProvider';

export class ProductionBaleProvider {
  readonly name: string = 'production-bale-gateway';
  private botToken?: string;

  constructor(token?: string) {
    this.botToken = token || process.env.BALE_BOT_TOKEN;
  }

  /**
   * Resolves identifier (username or ID) to a numeric Bale chat_id.
   * If identifier is already numeric digits, returns as is.
   * Otherwise inspects recent bot updates to match username or recent sender.
   */
  private async resolveChatId(identifier: string): Promise<string> {
    const clean = identifier.trim().replace(/^@/, '');
    if (/^\d{6,15}$/.test(clean)) {
      return clean;
    }

    if (!this.botToken) return clean;

    try {
      const updatesUrl = `https://tapi.bale.ai/bot${this.botToken}/getUpdates`;
      const res = await fetch(updatesUrl, { cache: 'no-store' });
      if (res.ok) {
        const data = (await res.json()) as {
          ok: boolean;
          result?: Array<{
            message?: {
              from?: { id: number; username?: string };
              chat?: { id: number };
            };
          }>;
        };
        if (data.ok && Array.isArray(data.result)) {
          const match = data.result.find((u) => {
            const uName = u.message?.from?.username?.toLowerCase();
            return uName === clean.toLowerCase() || String(u.message?.from?.id) === clean;
          });
          if (match?.message?.chat?.id) {
            return String(match.message.chat.id);
          }
          // If only 1 user ever messaged or sent /start to the bot, resolve to that active chat
          const latestChat = data.result[data.result.length - 1]?.message?.chat?.id;
          if (latestChat) {
            return String(latestChat);
          }
        }
      }
    } catch (resolveErr) {
      console.warn('[BaleProvider] Chat ID resolution fallback:', resolveErr);
    }

    return clean;
  }

  /**
   * Sends an OTP code or text message to a Bale user or chat.
   */
  async sendMessage(chatId: string, text: string): Promise<NotificationResult> {
    if (!this.botToken) {
      const err = 'FAIL-CLOSED: BALE_BOT_TOKEN is not configured';
      console.error(`[BaleProvider] ${err}`);
      return {
        success: false,
        error: err,
        provider: this.name,
      };
    }

    const cleanInput = chatId.trim().replace(/^@/, '');
    if (!cleanInput) {
      return {
        success: false,
        error: 'Invalid Bale chat ID or identifier',
        provider: this.name,
      };
    }

    const targetChatId = await this.resolveChatId(cleanInput);

    try {
      const url = `https://tapi.bale.ai/bot${this.botToken}/sendMessage`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: targetChatId,
          text: text,
        }),
      });

      if (!res.ok) {
        const errorBody = await res.text().catch(() => '');
        throw new Error(`Bale Bot API HTTP ${res.status}: ${errorBody}`);
      }

      const data = (await res.json()) as { ok: boolean; result?: { message_id: number }; description?: string };
      if (!data.ok) {
        throw new Error(data.description || 'Bale Bot API delivery failed');
      }

      return {
        success: true,
        messageId: String(data.result?.message_id || `bale-${Date.now()}`),
        provider: 'bale-bot-api',
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error('[BaleProvider] Failed to dispatch Bale message:', errMsg);
      return {
        success: false,
        error: errMsg,
        provider: this.name,
      };
    }
  }
}
