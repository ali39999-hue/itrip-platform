/**
 * Structured JSON logger with PII/secret redaction (OBS-003, OBS-004).
 *
 * Every line is machine-searchable JSON: { ts, level, component, correlationId, message, fields }.
 * Field keys that could carry credentials or personal data are replaced with
 * '[REDACTED]' before serialization — secrets, OTP codes, document numbers and
 * payment data must never reach the logs, even when callers pass them carelessly.
 */

const REDACT_KEY_PATTERN =
  /^(pass(word)?|passwd|pwd|otp|code|secret|token|authorization|auth|cookie|passport(number)?|national(id|code|number)?|card(number)?|cc(number)?|cvv|cvc|pin|api_?key|sessionid|session_id)$/i;

const MAX_DEPTH = 6;
const MAX_ARRAY = 50;

function redact(value: unknown, depth: number = 0): unknown {
  if (value === null || typeof value !== 'object') return value;
  if (depth >= MAX_DEPTH) return '[TRUNCATED]';

  if (Array.isArray(value)) {
    return value.slice(0, MAX_ARRAY).map((item) => redact(item, depth + 1));
  }

  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    out[key] = REDACT_KEY_PATTERN.test(key) ? '[REDACTED]' : redact(val, depth + 1);
  }
  return out;
}

export type LogLevel = 'info' | 'warn' | 'error';

export interface LogFields {
  [key: string]: unknown;
}

export interface StructuredLogger {
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
}

export function createLogger(component: string, correlationId?: string): StructuredLogger {
  const emit = (level: LogLevel, message: string, fields?: LogFields): void => {
    const entry: Record<string, unknown> = {
      ts: new Date().toISOString(),
      level,
      component,
      ...(correlationId ? { correlationId } : {}),
      message,
    };
    if (fields && Object.keys(fields).length > 0) {
      entry.fields = redact(fields);
    }

    const line = JSON.stringify(entry);
    if (level === 'error') console.error(line);
    else if (level === 'warn') console.warn(line);
    else console.log(line);
  };

  return {
    info: (message, fields) => emit('info', message, fields),
    warn: (message, fields) => emit('warn', message, fields),
    error: (message, fields) => emit('error', message, fields),
  };
}
