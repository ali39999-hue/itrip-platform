/**
 * Production SMS Provider Adapter (AUTH-103)
 *
 * Implements hardened SMS delivery for Kavenegar and FarazSMS (IPPanel) gateways.
 * Enforces fail-closed secret checks in production, recipient normalization,
 * delivery record tracking, and resilient retry logic for transient transport failures.
 */

export interface SmsDeliveryRecord {
  messageId: string;
  provider: string;
  recipient: string;
  status: 'DELIVERED' | 'SENT' | 'FAILED';
  statusCode?: number;
  cost?: number;
  timestamp: Date;
  error?: string;
  rawResponse?: Record<string, unknown>;
}

export interface SmsSendOptions {
  sender?: string;
  templateCode?: string;
  tokens?: Record<string, string>;
}

/**
 * Validates outgoing SMS API URLs against SSRF:
 * 1. Enforces HTTP or HTTPS protocol only
 * 2. Whitelists permitted Iranian SMS providers
 * 3. Rejects localhost, loopback, private, and reserved IP ranges
 */
function assertSafeSmsUrl(urlStr: string): URL {
  const parsed = new URL(urlStr);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Security violation: Only HTTP/HTTPS allowed for SMS gateway requests');
  }

  const allowedHosts = new Set([
    'smswbs.ir',
    'www.smswbs.ir',
    'smshooshmand.com',
    'api.kavenegar.com',
    'api2.ippanel.com',
  ]);

  if (!allowedHosts.has(parsed.hostname.toLowerCase())) {
    throw new Error(`Security violation: Destination host ${parsed.hostname} is not permitted`);
  }

  const hostname = parsed.hostname.toLowerCase();
  const isForbidden =
    hostname === 'localhost' ||
    hostname.endsWith('.local') ||
    /^127\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname) ||
    hostname === '::1';

  if (isForbidden) {
    throw new Error('Security violation: Access to private or loopback addresses is forbidden');
  }

  return parsed;
}

export class ProductionSmsProvider {
  readonly name: string = 'production-sms-gateway';
  private apiKey?: string;
  private smswbsUser?: string;
  private smswbsPass?: string;
  private providerType: 'kavenegar' | 'farazsms' | 'smswbs';
  private defaultSender: string;

  constructor(options?: {
    apiKey?: string;
    providerType?: 'kavenegar' | 'farazsms' | 'smswbs';
    defaultSender?: string;
  }) {
    this.smswbsUser = options?.apiKey === '' ? undefined : process.env.SMSWBS_USERNAME;
    this.smswbsPass = options?.apiKey === '' ? undefined : process.env.SMSWBS_PASSWORD;

    this.apiKey =
      options?.apiKey !== undefined
        ? options.apiKey
        : (process.env.KAVENEGAR_API_KEY ||
           process.env.FARAZ_SMS_API_KEY ||
           process.env.SMS_PROVIDER_API_KEY ||
           this.smswbsPass);

    this.providerType =
      options?.providerType ||
      (this.smswbsUser && this.smswbsPass
        ? 'smswbs'
        : process.env.FARAZ_SMS_API_KEY
          ? 'farazsms'
          : 'kavenegar');

    this.defaultSender =
      options?.defaultSender ||
      process.env.SMS_SENDER_LINE ||
      '10008800';
  }

  private static isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  /**
   * Normalize phone number to standard Iranian / E.164 representation
   */
  static normalizePhoneNumber(phone: string): string {
    let clean = phone.trim().replace(/[\s\-\(\)]/g, '');
    if (clean.startsWith('0098')) {
      clean = '+98' + clean.slice(4);
    } else if (clean.startsWith('09')) {
      clean = '+98' + clean.slice(1);
    } else if (clean.startsWith('989')) {
      clean = '+' + clean;
    }
    return clean;
  }

  /**
   * Validate recipient phone number
   */
  static isValidIranianMobile(phone: string): boolean {
    const normalized = this.normalizePhoneNumber(phone);
    return /^\+989\d{9}$/.test(normalized);
  }

  /**
   * Send SMS with fail-closed secret checks and automatic transient retry
   */
  async sendSms(
    to: string,
    message: string,
    options?: SmsSendOptions
  ): Promise<SmsDeliveryRecord> {
    // 1. Fail-closed secret checks (AUTH-103)
    if (!this.apiKey || this.apiKey.trim().length === 0) {
      if (ProductionSmsProvider.isProduction()) {
        const err = 'FAIL_CLOSED: SMS provider API key is missing or unconfigured in production environment';
        console.error(`[ProductionSmsProvider] ${err}`);
        return {
          messageId: `err-${Date.now()}`,
          provider: this.name,
          recipient: to,
          status: 'FAILED',
          timestamp: new Date(),
          error: err,
        };
      }

      // Safe non-production developer simulation
      console.warn('[ProductionSmsProvider] Non-production environment missing API key; simulating delivery.');
      const masked = to.length > 7 ? `${to.slice(0, 4)}***${to.slice(-2)}` : '***';
      console.log(`[SMS:Simulated] To: ${masked} | Content: ${message}`);
      return {
        messageId: `sim-sms-${Date.now()}`,
        provider: 'simulator',
        recipient: to,
        status: 'SENT',
        statusCode: 200,
        timestamp: new Date(),
      };
    }

    const recipient = ProductionSmsProvider.normalizePhoneNumber(to);
    if (!ProductionSmsProvider.isValidIranianMobile(recipient)) {
      return {
        messageId: `invalid-${Date.now()}`,
        provider: this.name,
        recipient: to,
        status: 'FAILED',
        timestamp: new Date(),
        error: `Invalid Iranian mobile number format: ${to}`,
      };
    }

    // 2. Dispatch with bounded retries for transient 5xx / timeout errors
    let lastError: string = 'Unknown SMS error';
    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        if (this.providerType === 'smswbs') {
          return await this.dispatchSmswbs(recipient, message, options);
        } else if (this.providerType === 'farazsms') {
          return await this.dispatchFarazSms(recipient, message, options);
        } else {
          return await this.dispatchKavenegar(recipient, message);
        }
      } catch (err: unknown) {
        lastError = err instanceof Error ? err.message : String(err);
        console.warn(`[ProductionSmsProvider] Attempt ${attempt}/${maxAttempts} failed: ${lastError}`);
        if (attempt < maxAttempts) {
          // Bounded jittered backoff: 50ms * 2^attempt + jitter
          const delay = Math.min(200 * Math.pow(2, attempt), 2000) + Math.random() * 100;
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }

    return {
      messageId: `fail-${Date.now()}`,
      provider: this.name,
      recipient,
      status: 'FAILED',
      timestamp: new Date(),
      error: `SMS delivery failed after ${maxAttempts} attempts: ${lastError}`,
    };
  }

  private async dispatchKavenegar(recipient: string, message: string): Promise<SmsDeliveryRecord> {
    const url = `https://api.kavenegar.com/v1/${this.apiKey}/sms/send.json`;
    assertSafeSmsUrl(url);
    const params = new URLSearchParams({
      receptor: recipient,
      message,
      sender: this.defaultSender,
    });

    const response = await fetch(`${url}?${params.toString()}`, {
      method: 'POST',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Kavenegar gateway returned HTTP ${response.status}`);
    }

    const data = (await response.json()) as {
      return?: { status: number; message: string };
      entries?: Array<{ messageid: number; cost?: number; status?: number }>;
    };

    if (data.return && data.return.status !== 200) {
      throw new Error(data.return.message || `Kavenegar error code ${data.return.status}`);
    }

    const entry = data.entries?.[0];
    const messageId = entry?.messageid ? String(entry.messageid) : `kav-${Date.now()}`;

    return {
      messageId,
      provider: 'kavenegar',
      recipient,
      status: 'SENT',
      statusCode: data.return?.status || 200,
      cost: entry?.cost,
      timestamp: new Date(),
      rawResponse: data as unknown as Record<string, unknown>,
    };
  }

  private async dispatchFarazSms(
    recipient: string,
    message: string,
    options?: SmsSendOptions
  ): Promise<SmsDeliveryRecord> {
    const url = 'https://api2.ippanel.com/api/v1/sms/send/webservice/single';
    const body = {
      recipient: [recipient],
      sender: options?.sender || this.defaultSender,
      message,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': this.apiKey!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`FarazSMS gateway returned HTTP ${response.status}`);
    }

    const data = (await response.json()) as {
      status?: string;
      code?: number;
      data?: { message_id?: number | string };
    };

    const messageId = data.data?.message_id ? String(data.data.message_id) : `faraz-${Date.now()}`;

    return {
      messageId,
      provider: 'farazsms',
      recipient,
      status: 'SENT',
      statusCode: data.code || 200,
      timestamp: new Date(),
      rawResponse: data as unknown as Record<string, unknown>,
    };
  }

  private async dispatchSmswbs(
    recipient: string,
    message: string,
    options?: SmsSendOptions
  ): Promise<SmsDeliveryRecord> {
    let localMobile = recipient.replace(/\D/g, '');
    if (localMobile.startsWith('989')) {
      localMobile = '0' + localMobile.slice(2);
    } else if (localMobile.startsWith('9') && localMobile.length === 10) {
      localMobile = '0' + localMobile;
    }

    const username = this.smswbsUser || process.env.SMSWBS_USERNAME;
    const password = this.smswbsPass || process.env.SMSWBS_PASSWORD;

    if (!username || !password) {
      throw new Error('SMSWBS credentials (SMSWBS_USERNAME / SMSWBS_PASSWORD) are unconfigured');
    }

    // 1. Try dedicated OTP endpoint first
    const safeOtpUrl = assertSafeSmsUrl('http://smswbs.ir/class/sms/restful/OTP/send_OTP.php');
    const otpBody = {
      username,
      api_password: password,
      mobile: localMobile,
      footer: 'سامانه فیروزو',
    };

    let otpRes;
    try {
      otpRes = await fetch(safeOtpUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(otpBody),
        signal: AbortSignal.timeout(5000),
      });
    } catch (netErr) {
      throw new Error(`SMSWBS transport error: ${netErr instanceof Error ? netErr.message : String(netErr)}`);
    }

    if (otpRes.ok) {
      const data = (await otpRes.json()) as { errCode?: number; result?: string | number };
      if (data.errCode === 0 || (data.errCode !== undefined && data.errCode >= 0)) {
        return {
          messageId: String(data.result || `smswbs-otp-${Date.now()}`),
          provider: 'smswbs-otp',
          recipient: localMobile,
          status: 'SENT',
          statusCode: 200,
          timestamp: new Date(),
          rawResponse: data as unknown as Record<string, unknown>,
        };
      }

      console.warn(`[SMSWBS:OTP] send_OTP returned code ${data.errCode}: ${data.result}. Attempting standard SMS fallback.`);
    }

    // 2. Fallback to standard OneToMany endpoint
    const safeSendUrl = assertSafeSmsUrl('http://smswbs.ir/class/sms/restful/sendSms_OneToMany.php');
    const sendBody = {
      username,
      api_password: password,
      from: options?.sender || this.defaultSender,
      to: [localMobile],
      text: message,
    };

    const sendRes = await fetch(safeSendUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sendBody),
      signal: AbortSignal.timeout(5000),
    });

    if (!sendRes.ok) {
      throw new Error(`SMSWBS gateway returned HTTP ${sendRes.status}`);
    }

    const sendData = (await sendRes.json()) as { errCode?: number; result?: string | number };
    if (sendData.errCode !== undefined && sendData.errCode < 0) {
      throw new Error(`SMSWBS error ${sendData.errCode}: ${sendData.result || 'Delivery failed'}`);
    }

    return {
      messageId: String(sendData.result || `smswbs-${Date.now()}`),
      provider: 'smswbs',
      recipient: localMobile,
      status: 'SENT',
      statusCode: 200,
      timestamp: new Date(),
      rawResponse: sendData as unknown as Record<string, unknown>,
    };
  }
}
