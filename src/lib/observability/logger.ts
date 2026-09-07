/**
 * Structured JSON logger with canonical PII/secret redaction and correlation context (OBS-003, OBS-004, SEC-108).
 *
 * Every line is machine-searchable JSON: { ts, level, component, correlationId, message, fields }.
 * Sensitive keys and embedded patterns (passwords, OTPs, CVVs, card PANs, tokens, national IDs)
 * are redacted before serialization.
 */

export {
  createRedactedLogger,
  createRedactedLogger as createLogger,
  redactSensitiveData,
  redactLogString,
  SENSITIVE_KEY_PATTERN,
  type LogLevel,
  type LogFields,
  type StructuredLogger,
} from './redacted-logger';
