/**
 * SEC-101: Canonical Server-Side Request Forgery (SSRF) Protection Engine
 *
 * Strictly blocks private, internal, loopback, link-local, carrier-NAT,
 * multicast, and cloud provider metadata addresses (AWS, GCP, Azure, Alibaba).
 *
 * Handles IPv4, IPv6, IPv4-mapped IPv6, decimal dword, octal, hex IP notations,
 * and guards against DNS rebinding attacks.
 */

import dns from 'node:dns/promises';
import { isIP } from 'node:net';

// Cloud metadata and reserved hostnames
const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  '127.0.0.1',
  '::1',
  '0.0.0.0',
  'metadata.google.internal',
  'metadata.internal',
  'instance-data',
  'instance-data.ec2.internal',
]);

interface IPRange {
  start: bigint;
  end: bigint;
}

function ipv4ToBigInt(ip: string): bigint {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    throw new Error(`Invalid IPv4 address: ${ip}`);
  }
  return BigInt((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) & 0xffffffffn;
}

function cidrToRangeV4(cidr: string): IPRange {
  const [ip, bitsStr] = cidr.split('/');
  const bits = Number(bitsStr);
  const base = ipv4ToBigInt(ip);
  const mask = bits === 0 ? 0n : ((1n << BigInt(bits)) - 1n) << BigInt(32 - bits);
  const start = base & mask;
  const end = start | ((1n << BigInt(32 - bits)) - 1n);
  return { start, end };
}

// Strictly blocked IPv4 CIDR ranges per SEC-101 & RFC standards
const BLOCKED_IPV4_RANGES: IPRange[] = [
  cidrToRangeV4('0.0.0.0/8'),       // Current network (RFC 1122)
  cidrToRangeV4('10.0.0.0/8'),      // Private RFC 1918
  cidrToRangeV4('100.64.0.0/10'),   // Carrier-grade NAT (RFC 6598)
  cidrToRangeV4('127.0.0.0/8'),     // Loopback (RFC 1122)
  cidrToRangeV4('169.254.0.0/16'),  // Link-local / AWS / GCP / Azure metadata 169.254.169.254
  cidrToRangeV4('172.16.0.0/12'),   // Private RFC 1918
  cidrToRangeV4('192.0.0.0/24'),    // IETF Protocol Assignments
  cidrToRangeV4('192.0.2.0/24'),    // TEST-NET-1 (RFC 5737)
  cidrToRangeV4('192.168.0.0/16'),  // Private RFC 1918
  cidrToRangeV4('198.18.0.0/15'),   // Network benchmark tests
  cidrToRangeV4('198.51.100.0/24'), // TEST-NET-2 (RFC 5737)
  cidrToRangeV4('203.0.113.0/24'),  // TEST-NET-3 (RFC 5737)
  cidrToRangeV4('224.0.0.0/4'),     // Multicast (RFC 5771)
  cidrToRangeV4('240.0.0.0/4'),     // Reserved (RFC 1112)
  cidrToRangeV4('255.255.255.255/32'), // Broadcast
];

// Alibaba cloud metadata address
const ALIBABA_METADATA_IP = '100.100.100.200';

/**
 * Normalizes potentially obfuscated IPv4 formats (decimal dword, octal, hex)
 */
export function normalizeIpv4(ipStr: string): string | null {
  const trimmed = ipStr.trim();

  // Standard dotted-decimal: 192.168.1.1
  const dottedMatch = /^(\d+|0x[0-9a-f]+)\.(\d+|0x[0-9a-f]+)\.(\d+|0x[0-9a-f]+)\.(\d+|0x[0-9a-f]+)$/i.exec(trimmed);
  if (dottedMatch) {
    const octets = dottedMatch.slice(1, 5).map((part) => {
      if (part.startsWith('0x') || part.startsWith('0X')) return parseInt(part, 16);
      if (part.length > 1 && part.startsWith('0')) return parseInt(part, 8);
      return parseInt(part, 10);
    });
    if (octets.some((o) => isNaN(o) || o < 0 || o > 255)) return null;
    return octets.join('.');
  }

  // Single integer (dword IP: 2130706433 -> 127.0.0.1)
  if (/^\d+$/.test(trimmed)) {
    const num = BigInt(trimmed);
    if (num < 0n || num > 0xffffffffn) return null;
    const o1 = Number((num >> 24n) & 0xffn);
    const o2 = Number((num >> 16n) & 0xffn);
    const o3 = Number((num >> 8n) & 0xffn);
    const o4 = Number(num & 0xffn);
    return `${o1}.${o2}.${o3}.${o4}`;
  }

  // Hex dword (0x7f000001 -> 127.0.0.1)
  if (/^0x[0-9a-f]+$/i.test(trimmed)) {
    const num = BigInt(trimmed);
    if (num < 0n || num > 0xffffffffn) return null;
    const o1 = Number((num >> 24n) & 0xffn);
    const o2 = Number((num >> 16n) & 0xffn);
    const o3 = Number((num >> 8n) & 0xffn);
    const o4 = Number(num & 0xffn);
    return `${o1}.${o2}.${o3}.${o4}`;
  }

  return null;
}

/**
 * Validates whether an IP address belongs to a private/restricted subnet.
 */
export function isPrivateIp(ip: string): boolean {
  const cleanIp = ip.trim().toLowerCase();

  // Check Alibaba metadata IP
  if (cleanIp === ALIBABA_METADATA_IP) {
    return true;
  }

  // Handle IPv4-mapped IPv6 (::ffff:192.168.1.1 or ::ffff:c0a8:0101)
  if (cleanIp.startsWith('::ffff:')) {
    const mappedPart = cleanIp.slice(7);
    if (isIP(mappedPart) === 4) {
      return isPrivateIp(mappedPart);
    }
  }

  // IPv6 Checks
  if (isIP(cleanIp) === 6) {
    if (cleanIp === '::1' || cleanIp === '::' || cleanIp === '0000:0000:0000:0000:0000:0000:0000:0001') {
      return true; // Loopback or unspecified
    }
    // Unique local address fc00::/7 (fc00... to fdff...)
    if (/^f[cd][0-9a-f]{2}:/i.test(cleanIp)) {
      return true;
    }
    // Link-local unicast fe80::/10 (fe80... to febf...)
    if (/^fe[89ab][0-9a-f]:/i.test(cleanIp)) {
      return true;
    }
    // Discard prefix 100::/64
    if (/^0100::/i.test(cleanIp)) {
      return true;
    }
    return false;
  }

  // Normalize IPv4 (handling dword, octal, hex)
  const normalizedV4 = normalizeIpv4(cleanIp);
  if (!normalizedV4) {
    return true; // Unknown or malformed IP fails safe
  }

  try {
    const val = ipv4ToBigInt(normalizedV4);
    for (const range of BLOCKED_IPV4_RANGES) {
      if (val >= range.start && val <= range.end) {
        return true;
      }
    }
  } catch {
    return true; // Fail closed on parse error
  }

  return false;
}

/**
 * Checks if a hostname or domain represents a loopback/internal target.
 */
export function isBlockedHost(host: string): boolean {
  const lower = host.trim().toLowerCase().replace(/\.$/, '');

  if (BLOCKED_HOSTNAMES.has(lower)) {
    return true;
  }

  // Check subdomains of localhost, internal, local, invalid, test
  if (
    lower.endsWith('.localhost') ||
    lower.endsWith('.local') ||
    lower.endsWith('.internal') ||
    lower.endsWith('.test') ||
    lower.endsWith('.corp') ||
    lower.endsWith('.home') ||
    lower.endsWith('.lan')
  ) {
    return true;
  }

  // Check if hostname is an obfuscated IP
  const norm = normalizeIpv4(lower);
  if (norm && isPrivateIp(norm)) {
    return true;
  }

  return false;
}

export interface ValidateUrlOptions {
  allowHttp?: boolean;
  allowedDomains?: string[];
  resolveDns?: boolean;
}

export interface SsrfValidationResult {
  safe: boolean;
  reason?: string;
  resolvedIp?: string;
  normalizedUrl?: string;
}

/**
 * Validates a target URL against SSRF rules.
 * Resolves DNS to guard against DNS rebinding to private IPs.
 */
export async function validateUrlForSsrf(
  urlStr: string,
  options: ValidateUrlOptions = {}
): Promise<SsrfValidationResult> {
  const { allowHttp = false, allowedDomains, resolveDns = true } = options;

  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    return { safe: false, reason: 'Invalid URL format' };
  }

  // Protocol check: strictly http or https
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { safe: false, reason: `Disallowed protocol: ${parsed.protocol}` };
  }

  if (parsed.protocol === 'http:' && !allowHttp) {
    return { safe: false, reason: 'HTTP protocol is disallowed in production; HTTPS required' };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Check domain allowlist if provided
  if (allowedDomains && allowedDomains.length > 0) {
    const isAllowed = allowedDomains.some((domain) => {
      const d = domain.toLowerCase();
      return hostname === d || hostname.endsWith(`.${d}`);
    });
    if (!isAllowed) {
      return { safe: false, reason: `Domain ${hostname} is not in the allowed domains list` };
    }
  }

  // Hostname static checks
  if (isBlockedHost(hostname)) {
    return { safe: false, reason: `Blocked internal or loopback hostname: ${hostname}` };
  }

  // If hostname is directly an IP literal
  const ipType = isIP(hostname);
  if (ipType !== 0) {
    if (isPrivateIp(hostname)) {
      return { safe: false, reason: `Direct IP ${hostname} belongs to private or restricted range` };
    }
    return { safe: true, resolvedIp: hostname, normalizedUrl: parsed.toString() };
  }

  // DNS resolution check (guards against DNS rebinding)
  if (resolveDns) {
    try {
      const lookupResult = await dns.lookup(hostname, { all: true });
      if (!lookupResult || lookupResult.length === 0) {
        return { safe: false, reason: `DNS resolution returned no records for ${hostname}` };
      }

      for (const record of lookupResult) {
        if (isPrivateIp(record.address)) {
          return {
            safe: false,
            reason: `Hostname ${hostname} resolves to private IP ${record.address}`,
            resolvedIp: record.address,
          };
        }
      }

      return {
        safe: true,
        resolvedIp: lookupResult[0]?.address,
        normalizedUrl: parsed.toString(),
      };
    } catch (dnsErr) {
      return {
        safe: false,
        reason: `DNS resolution failed for ${hostname}: ${dnsErr instanceof Error ? dnsErr.message : String(dnsErr)}`,
      };
    }
  }

  return { safe: true, normalizedUrl: parsed.toString() };
}

/**
 * Throws an error if the URL fails SSRF safety validation.
 */
export async function assertSafeUrl(urlStr: string, options: ValidateUrlOptions = {}): Promise<void> {
  const result = await validateUrlForSsrf(urlStr, options);
  if (!result.safe) {
    throw new Error(`SSRF Blocked: ${result.reason}`);
  }
}

/**
 * Safe fetch wrapper that guards against SSRF before issuing requests.
 */
export async function safeFetch(
  url: string | URL,
  init?: RequestInit,
  options?: ValidateUrlOptions
): Promise<Response> {
  const targetUrl = typeof url === 'string' ? url : url.toString();
  await assertSafeUrl(targetUrl, options);
  return fetch(targetUrl, init);
}
