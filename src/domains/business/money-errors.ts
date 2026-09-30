/**
 * Business money errors. Every failure carries a stable `code` so the API can
 * return a machine-readable error rather than an opaque Persian string.
 */

export class InvalidBusinessMoneyError extends Error {
  readonly code = 'invalid_amount';
  readonly field: string;
  readonly received: unknown;

  constructor(message: string, field: string, received: unknown) {
    super(message);
    this.name = 'InvalidBusinessMoneyError';
    this.field = field;
    this.received = received;
  }
}
