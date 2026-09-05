import { describe, it, expect } from 'vitest';
import {
  encryptSensitive,
  decryptSensitive,
  maskDocumentNumber,
  maskNationalId,
} from './crypto-vault';

describe('PII Security & Field-Level Encryption Suite (Section 34)', () => {
  it('encrypts sensitive passport data with AES-256-GCM and decrypts back accurately', () => {
    const rawPassport = 'A987654321';
    const encrypted = encryptSensitive(rawPassport);

    expect(encrypted).toMatch(/^enc:v1:[0-9a-f]{24}:[0-9a-f]{32}:[0-9a-f]+$/);
    expect(encrypted).not.toContain(rawPassport);

    const decrypted = decryptSensitive(encrypted);
    expect(decrypted).toBe(rawPassport);
  });

  it('masks document numbers for secure UI rendering without leaking full data', () => {
    const passport = 'A12345678';
    const masked = maskDocumentNumber(passport);
    expect(masked).toBe('A12****78');

    // Also masks when already encrypted
    const encrypted = encryptSensitive(passport);
    const maskedEncrypted = maskDocumentNumber(encrypted);
    expect(maskedEncrypted).toBe('A12****78');
  });

  it('masks national IDs cleanly', () => {
    const nid = '0012345678';
    const masked = maskNationalId(nid);
    expect(masked).toBe('001****678');
  });

  it('throws error when tampering with encrypted ciphertext or authentication tag', () => {
    const encrypted = encryptSensitive('P1234567');
    const tampered = encrypted.slice(0, -4) + '0000'; // Alter last 4 hex characters

    expect(() => decryptSensitive(tampered)).toThrow();
  });
});
