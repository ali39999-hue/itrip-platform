/**
 * Production Email Provider Adapter (AUTH-104)
 *
 * Implements hardened email delivery via the Resend API.
 * Features fail-closed secret validation in production, exponential backoff
 * with jitter for transient 429/5xx responses, and durable delivery status records.
 */

export interface EmailDeliveryRecord {
  messageId: string;
  provider: string;
  recipient: string;
  subject: string;
  status: 'SENT' | 'FAILED';
  statusCode?: number;
  timestamp: Date;
  error?: string;
  rawResponse?: Record<string, unknown>;
}

export interface EmailSendOptions {
  from?: string;
  replyTo?: string;
  text?: string;
}

export class ProductionEmailProvider {
  readonly name: string = 'resend';
  private apiKey?: string;
  private defaultFrom: string;

  constructor(options?: { apiKey?: string; defaultFrom?: string }) {
    this.apiKey = options?.apiKey || process.env.RESEND_API_KEY;
    this.defaultFrom =
      options?.defaultFrom ||
      process.env.EMAIL_FROM ||
      'Firuzo <noreply@firuzo.com>';
  }

  private static isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }

  /**
   * Send email with fail-closed secret checks and transient retry logic
   */
  async sendEmail(
    to: string,
    subject: string,
    htmlBody: string,
    options?: EmailSendOptions
  ): Promise<EmailDeliveryRecord> {
    // 1. Fail-closed secret checks (AUTH-104)
    if (!this.apiKey || this.apiKey.trim().length === 0) {
      if (ProductionEmailProvider.isProduction()) {
        const err = 'FAIL_CLOSED: RESEND_API_KEY is missing or unconfigured in production environment';
        console.error(`[ProductionEmailProvider] ${err}`);
        return {
          messageId: `err-${Date.now()}`,
          provider: this.name,
          recipient: to,
          subject,
          status: 'FAILED',
          timestamp: new Date(),
          error: err,
        };
      }

      // Dev/Demo fallback
      console.warn('[ProductionEmailProvider] Missing RESEND_API_KEY; simulating delivery.');
      const [userPart, domainPart] = to.split('@');
      const maskedEmail = domainPart ? `${userPart?.slice(0, 2)}***@${domainPart}` : '***';
      console.log(`[Email:Simulated] To: ${maskedEmail} | Subject: ${subject} | Body: ${htmlBody.slice(0, 50)}...`);
      return {
        messageId: `sim-email-${Date.now()}`,
        provider: 'simulator',
        recipient: to,
        subject,
        status: 'SENT',
        statusCode: 200,
        timestamp: new Date(),
      };
    }

    if (!ProductionEmailProvider.isValidEmail(to)) {
      return {
        messageId: `invalid-${Date.now()}`,
        provider: this.name,
        recipient: to,
        subject,
        status: 'FAILED',
        timestamp: new Date(),
        error: `Invalid email address format: ${to}`,
      };
    }

    // 2. Dispatch with bounded retries for 429/5xx and network errors
    const maxAttempts = 3;
    let lastError: string = 'Unknown email error';

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: options?.from || this.defaultFrom,
            to: [to.trim()],
            subject,
            html: htmlBody,
            text: options?.text,
            reply_to: options?.replyTo,
          }),
        });

        if (!res.ok) {
          const errorText = await res.text().catch(() => '');
          // Do not retry 4xx errors except 429 rate limit
          if (res.status >= 400 && res.status < 500 && res.status !== 429) {
            return {
              messageId: `err-${Date.now()}`,
              provider: this.name,
              recipient: to,
              subject,
              status: 'FAILED',
              statusCode: res.status,
              timestamp: new Date(),
              error: `Resend API returned HTTP ${res.status}: ${errorText}`,
            };
          }
          throw new Error(`Resend API returned HTTP ${res.status}: ${errorText}`);
        }

        const data = (await res.json()) as { id?: string };
        const messageId = data.id || `resend-${Date.now()}`;

        return {
          messageId,
          provider: this.name,
          recipient: to,
          subject,
          status: 'SENT',
          statusCode: res.status,
          timestamp: new Date(),
          rawResponse: data as unknown as Record<string, unknown>,
        };
      } catch (err: unknown) {
        lastError = err instanceof Error ? err.message : String(err);
        console.warn(`[ProductionEmailProvider] Attempt ${attempt}/${maxAttempts} failed: ${lastError}`);
        if (attempt < maxAttempts) {
          const backoff = Math.min(200 * Math.pow(2, attempt), 2000) + Math.random() * 100;
          await new Promise((r) => setTimeout(r, backoff));
        }
      }
    }

    return {
      messageId: `fail-${Date.now()}`,
      provider: this.name,
      recipient: to,
      subject,
      status: 'FAILED',
      timestamp: new Date(),
      error: `Email delivery failed after ${maxAttempts} attempts: ${lastError}`,
    };
  }
}
