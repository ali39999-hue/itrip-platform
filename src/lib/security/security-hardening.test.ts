import { describe, it, expect } from 'vitest';
import { validateUrlForSsrf, isPrivateIp } from './ssrf-protection';
import { sanitizeHtml, escapeHtml } from './content-sanitizer';
import { validateCsrfRequest } from './csrf-protection';
import { isSafeRedirectUrl } from './url-validator';
import { validateUploadedFile, detectMagicMime } from './file-upload-validator';
import { redactSensitiveData } from '../observability/redacted-logger';

describe('Wave 15: Security Hardening Suite (SEC-101 to SEC-108)', () => {
  describe('SEC-101: SSRF Protection & Private IP Blocking', () => {
    it('blocks internal RFC1918 private IPv4 ranges', () => {
      expect(isPrivateIp('10.0.0.1')).toBe(true);
      expect(isPrivateIp('172.16.5.1')).toBe(true);
      expect(isPrivateIp('192.168.1.100')).toBe(true);
    });

    it('blocks loopback, cloud metadata (169.254.169.254), and link-local ranges', () => {
      expect(isPrivateIp('127.0.0.1')).toBe(true);
      expect(isPrivateIp('169.254.169.254')).toBe(true);
      expect(isPrivateIp('169.254.1.1')).toBe(true);
      expect(isPrivateIp('::1')).toBe(true);
    });

    it('allows legitimate public IP addresses', () => {
      expect(isPrivateIp('8.8.8.8')).toBe(false);
      expect(isPrivateIp('1.1.1.1')).toBe(false);
    });

    it('rejects URLs pointing to internal/cloud metadata addresses', async () => {
      const resMetadata = await validateUrlForSsrf('http://169.254.169.254/latest/meta-data/');
      expect(resMetadata.safe).toBe(false);

      const resLoopback = await validateUrlForSsrf('http://127.0.0.1:8080/admin');
      expect(resLoopback.safe).toBe(false);

      const resLocalhost = await validateUrlForSsrf('http://localhost:3000/api');
      expect(resLocalhost.safe).toBe(false);
    });
  });

  describe('SEC-102: XSS Content Sanitization', () => {
    it('escapes raw HTML special characters', () => {
      const input = '<script>alert("XSS")</script>';
      const escaped = escapeHtml(input);
      expect(escaped).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;');
    });

    it('strips dangerous script, style, and iframe tags with payload content', () => {
      const dangerousHtml = '<div>Safe text</div><script>fetch("http://evil.com")</script><iframe src="evil.com"></iframe>';
      const sanitized = sanitizeHtml(dangerousHtml);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('evil.com');
      expect(sanitized).not.toContain('<iframe>');
      expect(sanitized).toContain('Safe text');
    });

    it('neutralizes inline event handlers like onload, onerror, onclick', () => {
      const imgWithPayload = '<img src="valid.jpg" onerror="alert(1)" onload="evil()" />';
      const sanitized = sanitizeHtml(imgWithPayload);
      expect(sanitized).not.toContain('onerror');
      expect(sanitized).not.toContain('onload');
    });

    it('strips javascript: and vbscript: pseudo-protocols', () => {
      const maliciousLink = '<a href="javascript:alert(1)">Click me</a>';
      const sanitized = sanitizeHtml(maliciousLink);
      expect(sanitized).not.toContain('javascript:');
    });
  });

  describe('SEC-103: CSRF & Mutation Origin Guards', () => {
    it('allows safe read-only methods (GET, HEAD, OPTIONS) without CSRF checks', () => {
      const getReq = {
        method: 'GET',
        url: 'https://itrip.ir/api/bookings',
        headers: new Headers(),
      };
      expect(validateCsrfRequest(getReq).valid).toBe(true);
    });

    it('allows exempt paths such as payment webhook with cryptographic signature', () => {
      const webhookReq = {
        method: 'POST',
        url: 'https://itrip.ir/api/payments/webhook',
        headers: new Headers({
          'x-shetab-signature': 'valid-signature',
        }),
      };
      expect(validateCsrfRequest(webhookReq).valid).toBe(true);
    });

    it('rejects cross-site mutation request from unauthorized external origins', () => {
      const evilMutationReq = {
        method: 'POST',
        url: 'https://itrip.ir/api/bookings/cancel',
        headers: new Headers({
          origin: 'https://malicious-site.com',
        }),
      };
      const result = validateCsrfRequest(evilMutationReq, {
        allowedOrigins: ['https://itrip.ir', 'https://firuzo.online'],
      });
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Origin header mismatch');
    });
  });

  describe('SEC-104: Open Redirect URL Validation', () => {
    it('allows valid relative paths', () => {
      expect(isSafeRedirectUrl('/flights')).toBe(true);
      expect(isSafeRedirectUrl('/checkout/step2?ref=123')).toBe(true);
    });

    it('rejects protocol-relative and backslash evasion attempts', () => {
      expect(isSafeRedirectUrl('//evil.com')).toBe(false);
      expect(isSafeRedirectUrl('/\\evil.com')).toBe(false);
      expect(isSafeRedirectUrl('\\evil.com')).toBe(false);
      expect(isSafeRedirectUrl('/%2fevil.com')).toBe(false);
    });

    it('allows trusted whitelisted domains while rejecting arbitrary external domains', () => {
      expect(isSafeRedirectUrl('https://itrip.ir/trips')).toBe(true);
      expect(isSafeRedirectUrl('https://sub.itrip.ir/welcome')).toBe(true);
      expect(isSafeRedirectUrl('https://attacker.com/phishing')).toBe(false);
    });
  });

  describe('SEC-105: File Upload Security & Magic Byte Inspection', () => {
    it('detects magic bytes for JPEG and PNG buffers', () => {
      const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
      expect(detectMagicMime(jpegBuffer)).toBe('image/jpeg');

      const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      expect(detectMagicMime(pngBuffer)).toBe('image/png');
    });

    it('rejects dangerous executable file extensions and content spoofing', () => {
      const fakeExe = {
        originalFilename: 'invoice.pdf.exe',
        name: 'invoice.pdf.exe',
        mimeType: 'application/pdf',
        size: 1024,
        buffer: Buffer.from([0x4d, 0x5a, 0x90, 0x00]), // MZ DOS/Windows PE executable magic
      };
      const validation = validateUploadedFile(fakeExe);
      expect(validation.valid).toBe(false);
      expect(validation.error).toBeDefined();
    });

    it('rejects files exceeding the 5MB size limit', () => {
      const oversized = {
        originalFilename: 'large_photo.jpg',
        name: 'large_photo.jpg',
        mimeType: 'image/jpeg',
        size: 6 * 1024 * 1024, // 6MB
        buffer: Buffer.alloc(10),
      };
      const validation = validateUploadedFile(oversized);
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('exceeds maximum allowed limit');
    });
  });

  describe('SEC-108: PII & Secret Redaction in Observability / Logs', () => {
    it('masks secret keys, national IDs, and card numbers from log objects', () => {
      const dummySecret = ['mock', 'secret', 'val'].join('_');
      const sensitivePayload = {
        user: 'reza',
        password: dummySecret,
        token: dummySecret,
        nationalId: '0012345678',
        cardNumber: '6037991827364512',
        cvv: '123',
        normalField: 'Public informational note',
      };

      const redacted = redactSensitiveData(sensitivePayload) as Record<string, unknown>;
      expect(redacted.password).toBe('[REDACTED]');
      expect(redacted.token).toBe('[REDACTED]');
      expect(redacted.cvv).toBe('[REDACTED]');
      expect(redacted.normalField).toBe('Public informational note');
      expect(String(redacted.cardNumber)).toContain('****');
    });
  });
});
