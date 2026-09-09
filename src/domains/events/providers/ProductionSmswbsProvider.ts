import { createLogger } from '@/lib/observability/logger';

const logger = createLogger('smswbs-otp-provider');

export interface SmswbsOtpResult {
  success: boolean;
  code?: string;
  messageId?: string;
  error?: string;
  rawResponse?: Record<string, unknown>;
}

export interface SmswbsCheckResult {
  valid: boolean;
  error?: string;
  rawResponse?: Record<string, unknown>;
}

/**
 * Normalizes phone number strictly for Iranian numbers.
 * Supports:
 * - 09123456789 -> +989123456789
 * - 9123456789  -> +989123456789
 * - 00989...    -> +989...
 * - +989...     -> +989...
 */
export function normalizeToIranE164(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('00989') && digits.length === 14) {
    return '+' + digits.slice(2);
  }
  if (digits.startsWith('989') && digits.length === 12) {
    return '+' + digits;
  }
  if (digits.startsWith('09') && digits.length === 11) {
    return '+98' + digits.slice(1);
  }
  if (digits.startsWith('9') && digits.length === 10) {
    return '+98' + digits;
  }
  return null;
}

export class ProductionSmswbsProvider {
  readonly sendEndpoint = 'http://smswbs.ir/class/sms/restful/OTP/send_OTP.php';
  readonly checkEndpoint = 'http://smswbs.ir/class/sms/restful/OTP/check_OTP.php';

  private uname: string;
  private pass: string;
  private sender: string;

  constructor() {
    this.uname = process.env.SMSWBS_USERNAME || '';
    this.pass = process.env.SMSWBS_PASSWORD || '';
    this.sender = process.env.SMSWBS_SENDER || '+989999178755';
  }

  /**
   * Generates and sends a 4-digit random OTP to the Iranian (+98) recipient.
   * Matches:
   * URL: http://smswbs.ir/class/sms/restful/OTP/send_OTP.php
   * Body:
   * {
   *   "uname": "09123764868",
   *   "pass": "Hvd1367Hvd1367",
   *   "from": "+989999178755",
   *   "to": "+98...",
   *   "msg": "متن پیامک(اختیاری)",
   *   "extra": { "len": 4, "time": 2, "lang": "fa", "sign": "متن امضای پیامک(اختیاری)" }
   * }
   */
  async sendOtp(phoneInput: string, msg: string = 'کد تایید ورود به فیروزو'): Promise<SmswbsOtpResult> {
    const to = normalizeToIranE164(phoneInput);
    if (!to) {
      return {
        success: false,
        error: 'شماره موبایل وارد شده نامعتبر است یا مربوط به پیش‌شماره ایران (+98) نمی‌باشد.',
      };
    }

    const payload = {
      uname: this.uname,
      pass: this.pass,
      from: this.sender,
      to,
      msg,
      extra: {
        len: 4,
        time: 2, // 2 minutes expiration in smswbs
        lang: 'fa',
        sign: 'فیروزو',
      },
    };

    try {
      const res = await fetch(this.sendEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        throw new Error(`SMSWBS HTTP error: ${res.status}`);
      }

      const data = (await res.json()) as {
        errCode?: number;
        result?: string | number;
        msgId?: number;
        code?: string;
        expire_at?: number;
      };

      // When success: errCode: 0, code: "xxxx"
      if (data.errCode === 0 && data.code) {
        logger.info('SMSWBS OTP successfully dispatched', {
          to: `${to.slice(0, 5)}***${to.slice(-2)}`,
          msgId: data.msgId,
        });

        return {
          success: true,
          code: String(data.code),
          messageId: String(data.msgId || data.result || `smswbs-${Date.now()}`),
          rawResponse: data as Record<string, unknown>,
        };
      }

      const errMessage = String(data.result || `SMSWBS error code: ${data.errCode}`);
      logger.warn('SMSWBS OTP dispatch returned non-zero code', {
        errCode: data.errCode,
        result: data.result,
      });

      return {
        success: false,
        error: errMessage,
        rawResponse: data as Record<string, unknown>,
      };
    } catch (err: unknown) {
      const errorStr = err instanceof Error ? err.message : String(err);
      logger.error('SMSWBS OTP dispatch failed with exception', { error: errorStr });
      return {
        success: false,
        error: errorStr,
      };
    }
  }

  /**
   * Verifies the OTP code via SMSWBS remote API endpoint:
   * URL: http://smswbs.ir/class/sms/restful/OTP/check_OTP.php
   * Body:
   * {
   *   "uname": "09123764868",
   *   "pass": "Hvd1367Hvd1367",
   *   "code": "کد دریافتی کاربر",
   *   "to": "+98..."
   * }
   */
  async checkOtp(phoneInput: string, code: string): Promise<SmswbsCheckResult> {
    const to = normalizeToIranE164(phoneInput);
    if (!to) {
      return {
        valid: false,
        error: 'شماره موبایل نامعتبر است',
      };
    }

    const payload = {
      uname: this.uname,
      pass: this.pass,
      code: code.trim(),
      to,
    };

    try {
      const res = await fetch(this.checkEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        throw new Error(`SMSWBS check HTTP error: ${res.status}`);
      }

      const data = (await res.json()) as {
        errCode?: number;
        result?: string | number;
      };

      // SMSWBS returns errCode: 0 on successful validation
      if (data.errCode === 0) {
        logger.info('SMSWBS OTP verification succeeded', {
          to: `${to.slice(0, 5)}***${to.slice(-2)}`,
        });
        return {
          valid: true,
          rawResponse: data as Record<string, unknown>,
        };
      }

      const errMessage = String(data.result || `کد تایید نادرست است (کد خطا: ${data.errCode})`);
      logger.warn('SMSWBS OTP check returned invalid code', {
        errCode: data.errCode,
        result: data.result,
      });

      return {
        valid: false,
        error: errMessage,
        rawResponse: data as Record<string, unknown>,
      };
    } catch (err: unknown) {
      const errorStr = err instanceof Error ? err.message : String(err);
      logger.error('SMSWBS OTP check request failed', { error: errorStr });
      return {
        valid: false,
        error: errorStr,
      };
    }
  }
}
