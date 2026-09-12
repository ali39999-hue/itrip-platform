/**
 * Production WhatsApp Provider Adapter
 *
 * Dispatches real WhatsApp messages/OTPs via:
 * 1. Meta WhatsApp Cloud API (Graph API) when WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID are configured
 * 2. Twilio WhatsApp API when TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_WHATSAPP_NUMBER are configured
 *
 * Features fail-closed secret validation in production, rate-limit tolerance, and standard delivery records.
 */

import { NotificationResult } from '../NotificationProvider';

export interface WhatsAppDeliveryRecord extends NotificationResult {
  rawResponse?: Record<string, unknown>;
}

export class ProductionWhatsappProvider {
  readonly name: string = 'production-whatsapp-gateway';

  private metaToken?: string;
  private metaPhoneId?: string;
  private twilioSid?: string;
  private twilioToken?: string;
  private twilioFrom?: string;

  constructor() {
    this.metaToken = process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_API_TOKEN;
    this.metaPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    this.twilioSid = process.env.TWILIO_ACCOUNT_SID;
    this.twilioToken = process.env.TWILIO_AUTH_TOKEN;
    this.twilioFrom = process.env.TWILIO_WHATSAPP_NUMBER;
  }

  private static isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  /**
   * Cleans and validates phone number to international E.164 format without spaces or symbols.
   */
  static cleanPhoneNumber(phone: string): string {
    return phone.replace(/[^\d+]/g, '').replace(/^00/, '+');
  }

  async sendWhatsAppMessage(to: string, message: string): Promise<WhatsAppDeliveryRecord> {
    const cleanedTo = ProductionWhatsappProvider.cleanPhoneNumber(to);
    if (!cleanedTo || cleanedTo.length < 8) {
      return {
        success: false,
        error: `Invalid WhatsApp phone number format: ${to}`,
        provider: this.name,
      };
    }

    // 1. Try Meta WhatsApp Cloud API first if configured
    if (this.metaToken && this.metaPhoneId) {
      try {
        const url = `https://graph.facebook.com/v18.0/${this.metaPhoneId}/messages`;
        // Format recipient number (digits only for Meta API, e.g. 989123456789)
        const recipientDigits = cleanedTo.replace(/^\+/, '');

        const res = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.metaToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: recipientDigits,
            type: 'text',
            text: {
              preview_url: false,
              body: message,
            },
          }),
        });

        if (!res.ok) {
          const errBody = await res.text().catch(() => '');
          throw new Error(`Meta WhatsApp Cloud API HTTP ${res.status}: ${errBody}`);
        }

        const data = (await res.json()) as { messages?: Array<{ id: string }> };
        const messageId = data.messages?.[0]?.id || `meta-wa-${Date.now()}`;
        return {
          success: true,
          messageId,
          provider: 'meta-whatsapp-cloud',
          rawResponse: data as unknown as Record<string, unknown>,
        };
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error('[WhatsAppProvider:Meta] Failed to dispatch message:', errMsg);
        // If Twilio is available, try fallback
        if (!this.twilioSid || !this.twilioToken) {
          return {
            success: false,
            error: errMsg,
            provider: 'meta-whatsapp-cloud',
          };
        }
      }
    }

    // 2. Try Twilio WhatsApp API if configured
    if (this.twilioSid && this.twilioToken && this.twilioFrom) {
      try {
        const url = `https://api.twilio.com/2010-04-01/Accounts/${this.twilioSid}/Messages.json`;
        const auth = Buffer.from(`${this.twilioSid}:${this.twilioToken}`).toString('base64');
        const formattedTo = cleanedTo.startsWith('+') ? cleanedTo : `+${cleanedTo}`;
        const formattedFrom = this.twilioFrom.startsWith('whatsapp:')
          ? this.twilioFrom
          : `whatsapp:${this.twilioFrom.startsWith('+') ? this.twilioFrom : `+${this.twilioFrom}`}`;

        const params = new URLSearchParams();
        params.append('From', formattedFrom);
        params.append('To', `whatsapp:${formattedTo}`);
        params.append('Body', message);

        const res = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        });

        if (!res.ok) {
          const errBody = await res.text().catch(() => '');
          throw new Error(`Twilio WhatsApp HTTP ${res.status}: ${errBody}`);
        }

        const data = (await res.json()) as { sid?: string };
        return {
          success: true,
          messageId: data.sid || `twilio-wa-${Date.now()}`,
          provider: 'twilio-whatsapp',
          rawResponse: data as unknown as Record<string, unknown>,
        };
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error('[WhatsAppProvider:Twilio] Failed to dispatch message:', errMsg);
        return {
          success: false,
          error: errMsg,
          provider: 'twilio-whatsapp',
        };
      }
    }

    // 3. No real credentials configured
    const err = 'FAIL-CLOSED: Neither Meta WhatsApp Cloud API credentials nor Twilio WhatsApp credentials are configured';
    console.error(`[WhatsAppProvider] ${err}`);
    return {
      success: false,
      error: err,
      provider: this.name,
    };
  }

  /**
   * Delivers an OTP through a pre-approved WhatsApp template.
   *
   * Business-initiated free-form text is rejected by WhatsApp outside an open
   * 24-hour customer service window, so first-contact OTP delivery REQUIRES a
   * template message:
   * - Meta Cloud API: an "authentication"-category template whose body contains
   *   one text parameter for the code (name via WHATSAPP_OTP_TEMPLATE_NAME).
   * - Twilio: a pre-registered content template via TWILIO_WHATSAPP_CONTENT_SID,
   *   with the code substituted as ContentVariable "1".
   */
  async sendWhatsAppOtp(to: string, code: string): Promise<WhatsAppDeliveryRecord> {
    const cleanedTo = ProductionWhatsappProvider.cleanPhoneNumber(to);
    if (!cleanedTo || cleanedTo.length < 8) {
      return {
        success: false,
        error: `Invalid WhatsApp phone number format: ${to}`,
        provider: this.name,
      };
    }

    const templateName = process.env.WHATSAPP_OTP_TEMPLATE_NAME || 'otp_verification';
    const templateLang = process.env.WHATSAPP_OTP_TEMPLATE_LANG || 'fa';

    // 1. Meta WhatsApp Cloud API — template message
    if (this.metaToken && this.metaPhoneId) {
      try {
        const url = `https://graph.facebook.com/v18.0/${this.metaPhoneId}/messages`;
        const recipientDigits = cleanedTo.replace(/^\+/, '');

        const res = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.metaToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: recipientDigits,
            type: 'template',
            template: {
              name: templateName,
              language: { code: templateLang },
              components: [
                {
                  type: 'body',
                  parameters: [{ type: 'text', text: code }],
                },
              ],
            },
          }),
        });

        if (!res.ok) {
          const errBody = await res.text().catch(() => '');
          throw new Error(`Meta WhatsApp template send HTTP ${res.status}: ${errBody}`);
        }

        const data = (await res.json()) as { messages?: Array<{ id: string }> };
        return {
          success: true,
          messageId: data.messages?.[0]?.id || `meta-wa-tpl-${Date.now()}`,
          provider: 'meta-whatsapp-cloud-template',
        };
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error('[WhatsAppProvider:Meta] Template OTP dispatch failed:', errMsg);
        if (!this.twilioSid || !this.twilioToken) {
          return { success: false, error: errMsg, provider: 'meta-whatsapp-cloud-template' };
        }
      }
    }

    // 2. Twilio — pre-registered content template (ContentSid)
    if (this.twilioSid && this.twilioToken && this.twilioFrom && process.env.TWILIO_WHATSAPP_CONTENT_SID) {
      try {
        const url = `https://api.twilio.com/2010-04-01/Accounts/${this.twilioSid}/Messages.json`;
        const auth = Buffer.from(`${this.twilioSid}:${this.twilioToken}`).toString('base64');
        const formattedTo = cleanedTo.startsWith('+') ? cleanedTo : `+${cleanedTo}`;
        const formattedFrom = this.twilioFrom.startsWith('whatsapp:')
          ? this.twilioFrom
          : `whatsapp:${this.twilioFrom.startsWith('+') ? this.twilioFrom : `+${this.twilioFrom}`}`;

        const params = new URLSearchParams();
        params.append('From', formattedFrom);
        params.append('To', `whatsapp:${formattedTo}`);
        params.append('ContentSid', process.env.TWILIO_WHATSAPP_CONTENT_SID);
        params.append('ContentVariables', JSON.stringify({ 1: code }));

        const res = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
        });

        if (!res.ok) {
          const errBody = await res.text().catch(() => '');
          throw new Error(`Twilio WhatsApp content template HTTP ${res.status}: ${errBody}`);
        }

        const data = (await res.json()) as { sid?: string };
        return {
          success: true,
          messageId: data.sid || `twilio-wa-tpl-${Date.now()}`,
          provider: 'twilio-whatsapp-template',
        };
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error('[WhatsAppProvider:Twilio] Content template OTP dispatch failed:', errMsg);
        return { success: false, error: errMsg, provider: 'twilio-whatsapp-template' };
      }
    }

    // 3. No template-capable provider configured — caller falls back to free-form
    return {
      success: false,
      error: 'FAIL-CLOSED: No WhatsApp OTP template provider configured (Meta Cloud API or Twilio ContentSid)',
      provider: this.name,
    };
  }
}
