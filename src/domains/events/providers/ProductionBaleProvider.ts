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

    const cleanChatId = chatId.trim().replace(/^@/, '');
    if (!cleanChatId) {
      return {
        success: false,
        error: 'Invalid Bale chat ID or identifier',
        provider: this.name,
      };
    }

    try {
      const url = `https://tapi.bale.ai/bot${this.botToken}/sendMessage`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: cleanChatId,
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
