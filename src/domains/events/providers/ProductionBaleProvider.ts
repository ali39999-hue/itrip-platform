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
import { prisma } from '@/lib/prisma';

export class ProductionBaleProvider {
  readonly name: string = 'production-bale-gateway';
  private botToken?: string;

  constructor(token?: string) {
    this.botToken = token !== undefined ? token : (process.env.BALE_BOT_TOKEN || '');
  }

  /**
   * Resolves identifier (username, phone, or numeric ID) to a numeric Bale chat_id.
   * If identifier is already a valid numeric user ID (not phone number), returns as is.
   * Otherwise queries database or inspects bot updates to match user.
   */
  private async resolveChatId(identifier: string): Promise<string> {
    const clean = identifier.trim().replace(/^@/, '');
    const isPhone = /^(09|\+98|98)\d{9}$/.test(clean);

    // If already a direct numeric Bale chat/user ID (and NOT a phone number)
    if (/^\d{6,10}$/.test(clean) && !isPhone && !clean.startsWith('09')) {
      return clean;
    }

    if (!this.botToken) return clean;

    // 1. Check database for existing user mapping
    try {
      const dbUser = await prisma.user.findFirst({
        where: {
          OR: [
            { baleId: clean },
            { baleId: `@${clean}` },
            { phone: clean },
            ...(clean.startsWith('09') ? [{ phone: '+98' + clean.slice(1) }] : []),
            ...(clean.startsWith('+98') ? [{ phone: '0' + clean.slice(3) }] : []),
          ],
        },
        select: { id: true, baleId: true },
      });

      if (dbUser?.baleId && /^\d{6,10}$/.test(dbUser.baleId) && !dbUser.baleId.startsWith('09')) {
        return dbUser.baleId;
      }
    } catch {
      // ignore db query error in resolution
    }

    // 2. Query Bale bot updates to dynamically resolve active user
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
              contact?: { phone_number?: string };
            };
          }>;
        };
        if (data.ok && Array.isArray(data.result) && data.result.length > 0) {
          const match = data.result.find((u) => {
            const uId = String(u.message?.from?.id);
            const uContactPhone = u.message?.contact?.phone_number?.replace(/\D/g, '');
            const cleanPhone = clean.replace(/\D/g, '');
            const isPhoneMatch = Boolean(
              uContactPhone &&
              cleanPhone &&
              cleanPhone.length >= 10 &&
              uContactPhone.slice(-10) === cleanPhone.slice(-10)
            );

            // Require explicit numeric Bale ID match or verified contact card phone match.
            // Never match unverified public usernames against phone numbers.
            return uId === clean || isPhoneMatch;
          });

          if (match?.message?.chat?.id) {
            const resolvedId = String(match.message.chat.id);
            // Cache in database if user exists
            prisma.user.updateMany({
              where: {
                OR: [
                  { phone: clean },
                  ...(clean.startsWith('09') ? [{ phone: '+98' + clean.slice(1) }] : []),
                ],
              },
              data: { baleId: resolvedId },
            }).catch(() => {});
            return resolvedId;
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

    if (!targetChatId || targetChatId.startsWith('09') || targetChatId.startsWith('+98') || !/^\d{5,12}$/.test(targetChatId)) {
      return {
        success: false,
        error: 'حساب بله برای این شماره یا شناسه یافت نشد. کاربر باید ابتدا در اپلیکیشن بله بازوی @firuzootpbot را باز کرده و دکمه شروع را بزند.',
        provider: this.name,
      };
    }

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
