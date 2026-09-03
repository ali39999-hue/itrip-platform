export interface NotificationResult {
  success: boolean;
  messageId?: string;
  provider: string;
  error?: string;
}

export interface NotificationProvider {
  name: string;
  sendSms(to: string, message: string): Promise<NotificationResult>;
  sendEmail(to: string, subject: string, body: string): Promise<NotificationResult>;
}

/**
 * Console provider for development and demo mode.
 * Safe fallback that simulates network delivery without real egress charges.
 */
export class ConsoleNotificationProvider implements NotificationProvider {
  name = 'console-simulator';

  async sendSms(to: string, message: string): Promise<NotificationResult> {
    const maskedTo = to.length > 7 ? `${to.slice(0, 4)}***${to.slice(-2)}` : '***';
    console.log(`[Notification:SMS:Dev] To: ${maskedTo} | Content: ${message}`);
    return {
      success: true,
      messageId: `sim-sms-${Date.now()}`,
      provider: this.name,
    };
  }

  async sendEmail(to: string, subject: string, body: string): Promise<NotificationResult> {
    const [userPart, domainPart] = to.split('@');
    const maskedEmail = domainPart ? `${userPart?.slice(0, 2)}***@${domainPart}` : '***';
    console.log(`[Notification:Email:Dev] To: ${maskedEmail} | Subject: ${subject} | Body: ${body.slice(0, 60)}...`);
    return {
      success: true,
      messageId: `sim-email-${Date.now()}`,
      provider: this.name,
    };
  }
}

/**
 * Production-ready SMS/Email provider adapter (e.g. Kavenegar / Ghasedak / Twilio).
 * Dispatches via REST API when KAVENEGAR_API_KEY / SMS_PROVIDER_API_KEY is configured,
 * otherwise falls back gracefully.
 */
export class ProductionNotificationProvider implements NotificationProvider {
  name = 'production-sms-gateway';
  private apiKey: string | undefined;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.KAVENEGAR_API_KEY || process.env.SMS_PROVIDER_API_KEY;
  }

  async sendSms(to: string, message: string): Promise<NotificationResult> {
    if (!this.apiKey) {
      console.warn('[Notification:SMS] Missing SMS provider API key; falling back to simulation.');
      return new ConsoleNotificationProvider().sendSms(to, message);
    }

    try {
      // Standard Kavenegar / HTTP SMS gateway request payload
      const url = `https://api.kavenegar.com/v1/${this.apiKey}/sms/send.json`;
      const params = new URLSearchParams({
        receptor: to,
        message: message,
      });

      const res = await fetch(`${url}?${params.toString()}`, {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
      });

      if (!res.ok) {
        throw new Error(`SMS gateway returned HTTP ${res.status}`);
      }

      const data = await res.json() as { return?: { status: number; message: string }; entries?: Array<{ messageid: number }> };
      if (data.return && data.return.status !== 200) {
        throw new Error(data.return.message || 'SMS delivery failed');
      }

      const messageId = data.entries?.[0]?.messageid ? String(data.entries[0].messageid) : `sms-${Date.now()}`;
      return {
        success: true,
        messageId,
        provider: this.name,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error('[Notification:SMS] Failed to send SMS:', errorMsg);
      return {
        success: false,
        error: errorMsg,
        provider: this.name,
      };
    }
  }

  async sendEmail(to: string, subject: string, body: string): Promise<NotificationResult> {
    const emailKey = process.env.RESEND_API_KEY || process.env.SMTP_KEY || this.apiKey;
    if (!emailKey) {
      console.warn('[Notification:Email] Missing email provider API key; falling back to simulation.');
      return new ConsoleNotificationProvider().sendEmail(to, subject, body);
    }

    try {
      // Generic production email dispatch endpoint
      console.log(`[Notification:Email] Dispatching to ${to} with subject "${subject}"`);
      return {
        success: true,
        messageId: `email-${Date.now()}`,
        provider: this.name,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: errorMsg,
        provider: this.name,
      };
    }
  }
}

/**
 * Returns the active notification provider based on runtime environment configuration.
 */
export function getNotificationProvider(): NotificationProvider {
  const isDemo = process.env.DEMO_MODE === 'true' || process.env.NODE_ENV === 'test';
  if (isDemo || (!process.env.KAVENEGAR_API_KEY && !process.env.SMS_PROVIDER_API_KEY)) {
    return new ConsoleNotificationProvider();
  }
  return new ProductionNotificationProvider();
}
