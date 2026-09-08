/**
 * SEC-108 & OBS-003: Canonical PII & Secret Redacted Logger
 *
 * Enforces strict redaction of sensitive credentials, payment details, and personal
 * identifiers (passwords, OTPs, CVVs, card PANs, tokens, national IDs, passports)
 * by both key pattern and deep value pattern inspection.
 * Automatically injects correlation context from AsyncLocalStorage.
 */

import { getCorrelationContext } from './correlation-context';

export const SENSITIVE_KEY_PATTERN =
  /^(pass(word)?|passwd|pwd|secret|api_?key|private_?key|token|access_?token|refresh_?token|auth|authorization|bearer|cookie|session_?id|sessionid|otp|code|pin|verification_?code|card_?(number)?|cc_?(number)?|pan|cvv\d?|cvc\d?|security_?code|expiry|passport_?(number)?|national_?(id|code|number)?|ssn|identity_?number)$/i;

// Regex patterns for sensitive values appearing anywhere in strings
const CARD_NUMBER_REGEX = /\b(?:\d{4}[ -]?){3}\d{4}\b|\b\d{16}\b/g;
const BEARER_TOKEN_REGEX = /Bearer\s+([A-Za-z0-9\-_.+=/]{12,})/gi;
const CONNECTION_STRING_PW_REGEX = /(:[^\s/@:]+)@/g;

const MAX_DEPTH = 6;
const MAX_ARRAY_LENGTH = 50;

/**
 * Masks a credit or debit card number, preserving only the last 4 digits.
 */
function maskCard(card: string): string {
  const digits = card.replace(/\D/g, '');
  if (digits.length >= 12 && digits.length <= 19) {
    return `****-****-****-${digits.slice(-4)}`;
  }
  return '[REDACTED_CARD]';
}

/**
 * Scans a string value and masks embedded PII, tokens, and credentials.
 */
export function redactLogString(str: string): string {
  if (typeof str !== 'string' || str.length === 0) return str;

  return str
    .replace(BEARER_TOKEN_REGEX, 'Bearer [REDACTED_TOKEN]')
    .replace(CONNECTION_STRING_PW_REGEX, ':***@')
    .replace(CARD_NUMBER_REGEX, (match) => maskCard(match));
}

/**
 * Recursively redacts sensitive keys and values from arbitrary payloads.
 */
export function redactSensitiveData(value: unknown, depth: number = 0): unknown {
  if (value === null || value === undefined) return value;

  if (typeof value === 'string') {
    return redactLogString(value);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (depth >= MAX_DEPTH) {
    return '[TRUNCATED]';
  }

  if (Array.isArray(value)) {
    return value.slice(0, MAX_ARRAY_LENGTH).map((item) => redactSensitiveData(item, depth + 1));
  }

  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY_PATTERN.test(k)) {
        if (typeof v === 'string' && /card|pan/i.test(k)) {
          out[k] = maskCard(v);
        } else {
          out[k] = '[REDACTED]';
        }
      } else {
        out[k] = redactSensitiveData(v, depth + 1);
      }
    }
    return out;
  }

  return String(value);
}

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogFields {
  [key: string]: unknown;
}

export interface StructuredLogger {
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
  debug?(message: string, fields?: LogFields): void;
}

/**
 * Creates a structured JSON logger that automatically redacts sensitive data
 * and incorporates correlation context from AsyncLocalStorage.
 */
export function createRedactedLogger(
  component: string,
  staticCorrelationId?: string
): StructuredLogger {
  const emit = (level: LogLevel, message: string, fields?: LogFields): void => {
    const asyncCtx = getCorrelationContext();

    const correlationId =
      staticCorrelationId ||
      asyncCtx?.correlationId ||
      asyncCtx?.requestId;

    const entry: Record<string, unknown> = {
      ts: new Date().toISOString(),
      level,
      component,
      ...(correlationId ? { correlationId } : {}),
      ...(asyncCtx?.requestId ? { requestId: asyncCtx.requestId } : {}),
      ...(asyncCtx?.bookingId ? { bookingId: asyncCtx.bookingId } : {}),
      ...(asyncCtx?.paymentId ? { paymentId: asyncCtx.paymentId } : {}),
      ...(asyncCtx?.sagaId ? { sagaId: asyncCtx.sagaId } : {}),
      ...(asyncCtx?.supplierRequestId ? { supplierRequestId: asyncCtx.supplierRequestId } : {}),
      message: redactLogString(message),
    };

    if (fields && Object.keys(fields).length > 0) {
      entry.fields = redactSensitiveData(fields);
    }

    const line = JSON.stringify(entry);
    if (level === 'error') {
      console.error(line);
    } else if (level === 'warn') {
      console.warn(line);
    } else {
      console.log(line);
    }
  };

  return {
    info: (msg, fields) => emit('info', msg, fields),
    warn: (msg, fields) => emit('warn', msg, fields),
    error: (msg, fields) => emit('error', msg, fields),
    debug: (msg, fields) => emit('debug', msg, fields),
  };
}
