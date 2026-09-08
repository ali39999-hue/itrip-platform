/**
 * Production Telegram Provider Adapter
 *
 * Implements real Telegram message delivery via the official Telegram Bot API,
 * plus cryptographic verification for Telegram Login Widget payloads.
 */

import crypto from 'crypto';
import { NotificationResult } from '../NotificationProvider';

export interface TelegramAuthPayload {
  id: number | string;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number | string;
  hash: string;
}

export class ProductionTelegramProvider {
  readonly name: string = 'production-telegram-gateway';
  private botToken?: string;

  constructor(token?: string) {
    this.botToken = token || process.env.TELEGRAM_BOT_TOKEN;
  }

  /**
   * Cryptographically verifies authentication data received from the official Telegram Login Widget.
   * Specification: https://core.telegram.org/widgets/login#checking-authorization
   */
  static verifyTelegramAuth(data: TelegramAuthPayload, botToken: string): boolean {
    if (!data || !data.hash || !botToken) return false;

    // Check expiration: reject auth if older than 24 hours (replay defense)
    const authDate = Number(data.auth_date);
    if (!authDate || isNaN(authDate)) return false;
    const nowInSeconds = Math.floor(Date.now() / 1000);
    if (nowInSeconds - authDate > 86400 || authDate > nowInSeconds + 300) {
      return false;
    }

    // Sort all key-value pairs alphabetically (excluding 'hash')
    const keys = Object.keys(data).filter((k) => k !== 'hash');
    for (let i = 0; i < keys.length; i++) {
      for (let j = i + 1; j < keys.length; j++) {
        if (keys[i].localeCompare(keys[j]) > 0) {
          const temp = keys[i];
          keys[i] = keys[j];
          keys[j] = temp;
        }
      }
    }

    const pairs: string[] = [];
    for (const key of keys) {
      const val = (data as unknown as Record<string, unknown>)[key];
      if (val !== undefined && val !== null) {
        pairs.push(`${key}=${val}`);
      }
    }
    const dataCheckString = pairs.join('\n');

    // Secret key is the SHA-256 hash of the bot token
    const secretKey = crypto.createHash('sha256').update(botToken).digest();

    // Calculate HMAC-SHA256 signature
    const hmac = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    // Secure timing-safe string comparison
    if (hmac.length !== data.hash.length) return false;
    return crypto.timingSafeEqual(Buffer.from(hmac, 'hex'), Buffer.from(data.hash, 'hex'));
  }

  /**
   * Sends a real text message or OTP code to a Telegram chat using Telegram Bot API.
   */
  async sendMessage(chatId: string, text: string): Promise<NotificationResult> {
    if (!this.botToken) {
      const err = 'FAIL-CLOSED: TELEGRAM_BOT_TOKEN is not configured';
      console.error(`[TelegramProvider] ${err}`);
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
        error: 'Invalid Telegram chat ID or username',
        provider: this.name,
      };
    }

    try {
      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: cleanChatId,
          text: text,
          parse_mode: 'HTML',
        }),
      });

      if (!res.ok) {
        const errorBody = await res.text().catch(() => '');
        throw new Error(`Telegram Bot API HTTP ${res.status}: ${errorBody}`);
      }

      const data = (await res.json()) as { ok: boolean; result?: { message_id: number }; description?: string };
      if (!data.ok) {
        throw new Error(data.description || 'Telegram Bot API delivery failed');
      }

      return {
        success: true,
        messageId: String(data.result?.message_id || `tg-${Date.now()}`),
        provider: 'telegram-bot-api',
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error('[TelegramProvider] Failed to dispatch Telegram message:', errMsg);
      return {
        success: false,
        error: errMsg,
        provider: this.name,
      };
    }
  }
}
