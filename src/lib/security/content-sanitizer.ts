/**
 * SEC-102: Canonical Content Sanitizer and XSS Prevention Engine
 *
 * Provides strict HTML escaping, robust tag & attribute allowlisting,
 * protocol sanitization, plain text stripping, and recursive object sanitization
 * for user-generated content (UGC) and CMS inputs.
 */

const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
};

const DANGEROUS_TAG_REGEX = /<\s*(script|style|iframe|object|embed|applet|meta|link|base|form|svg|math)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi;
const DANGEROUS_SELF_CLOSING_TAG_REGEX = /<\s*(script|style|iframe|object|embed|applet|meta|link|base|form|svg|math)[^>]*\/?>/gi;
const EVENT_HANDLER_REGEX = /\son\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi;
const JAVASCRIPT_PROTOCOL_REGEX = /(?:javascript|vbscript|data\s*:(?!image\/(?:png|jpe?g|gif|webp))):/gi;

/** Default safe tags allowed in rich text / CMS */
export const DEFAULT_ALLOWED_TAGS = new Set([
  'p', 'br', 'b', 'strong', 'i', 'em', 'u', 's', 'strike',
  'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'blockquote', 'span', 'a', 'hr', 'code', 'pre'
]);

/** Allowed attributes per tag */
export const DEFAULT_ALLOWED_ATTRIBUTES: Record<string, Set<string>> = {
  a: new Set(['href', 'title', 'target', 'rel']),
  span: new Set(['class']),
  p: new Set(['class']),
  code: new Set(['class']),
  pre: new Set(['class']),
  h1: new Set(['class']),
  h2: new Set(['class']),
  h3: new Set(['class']),
  h4: new Set(['class']),
  h5: new Set(['class']),
  h6: new Set(['class']),
};

/**
 * Escapes unsafe HTML characters to prevent XSS in text nodes and attribute values.
 */
export function escapeHtml(str: string): string {
  if (typeof str !== 'string') return '';
  return str.replace(/[&<>"'`/]/g, (char) => HTML_ESCAPE_MAP[char] || char);
}

/**
 * Strips all HTML tags and control characters to produce safe plain text.
 */
export function sanitizePlainText(input: string): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/\0/g, '') // strip null bytes
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // control chars
    .replace(/<[^>]*>/g, '') // strip all HTML tags
    .trim();
}

export interface SanitizeHtmlOptions {
  allowedTags?: Set<string>;
  allowedAttributes?: Record<string, Set<string>>;
  enforceNoopener?: boolean;
}

/**
 * Sanitizes rich text / HTML content against an allowlist of tags and attributes.
 */
export function sanitizeHtml(html: string, options: SanitizeHtmlOptions = {}): string {
  if (typeof html !== 'string') return '';

  const allowedTags = options.allowedTags ?? DEFAULT_ALLOWED_TAGS;
  const allowedAttrs = options.allowedAttributes ?? DEFAULT_ALLOWED_ATTRIBUTES;
  const enforceNoopener = options.enforceNoopener !== false;

  // 1. Strip null bytes
  let sanitized = html.replace(/\0/g, '');

  // 2. Strip dangerous tags with their contents (script, style, iframe, etc.)
  sanitized = sanitized.replace(DANGEROUS_TAG_REGEX, '');
  sanitized = sanitized.replace(DANGEROUS_SELF_CLOSING_TAG_REGEX, '');

  // 3. Strip event handlers (onload, onclick, onerror, etc.)
  sanitized = sanitized.replace(EVENT_HANDLER_REGEX, '');

  // 4. Strip dangerous pseudo-protocols in href/src
  sanitized = sanitized.replace(JAVASCRIPT_PROTOCOL_REGEX, 'blocked:');

  // 5. Parse and filter tags
  sanitized = sanitized.replace(/<\/?([a-zA-Z0-9]+)([^>]*)>/g, (match, tagNameRaw, attrString) => {
    const tagName = tagNameRaw.toLowerCase();

    if (!allowedTags.has(tagName)) {
      return ''; // Strip disallowed tags
    }

    const isClosing = match.startsWith('</');
    if (isClosing) {
      return `</${tagName}>`;
    }

    // Process attributes for opening tag
    const allowedForTag = allowedAttrs[tagName] || new Set();
    const cleanAttrs: string[] = [];

    const attrRegex = /([a-zA-Z0-9_-]+)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
    let attrMatch: RegExpExecArray | null;

    let hasTargetBlank = false;

    while ((attrMatch = attrRegex.exec(attrString)) !== null) {
      const attrName = attrMatch[1].toLowerCase();
      const rawVal = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? '';

      // Disallow inline style and event handlers
      if (attrName.startsWith('on') || attrName === 'style') {
        continue;
      }

      if (!allowedForTag.has(attrName)) {
        continue;
      }

      // Check href protocol
      if (attrName === 'href') {
        const trimmedVal = rawVal.trim().toLowerCase();
        if (
          trimmedVal.startsWith('javascript:') ||
          trimmedVal.startsWith('vbscript:') ||
          trimmedVal.startsWith('data:') ||
          trimmedVal.startsWith('file:')
        ) {
          continue; // Drop dangerous protocol
        }
      }

      if (attrName === 'target' && rawVal === '_blank') {
        hasTargetBlank = true;
      }

      cleanAttrs.push(`${attrName}="${escapeHtml(rawVal)}"`);
    }

    if (tagName === 'a' && hasTargetBlank && enforceNoopener) {
      // Ensure rel contains noopener noreferrer
      const relIdx = cleanAttrs.findIndex((a) => a.startsWith('rel='));
      if (relIdx >= 0) {
        cleanAttrs[relIdx] = 'rel="noopener noreferrer"';
      } else {
        cleanAttrs.push('rel="noopener noreferrer"');
      }
    }

    return cleanAttrs.length > 0
      ? `<${tagName} ${cleanAttrs.join(' ')}>`
      : `<${tagName}>`;
  });

  return sanitized.trim();
}

/**
 * Deeply sanitizes all string fields of a user input object/payload.
 */
export function sanitizeUserObject<T>(obj: T, richTextFields: string[] = ['content', 'description', 'itinerary', 'summary']): T {
  if (obj === null || typeof obj !== 'object') {
    if (typeof obj === 'string') {
      return sanitizePlainText(obj) as unknown as T;
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeUserObject(item, richTextFields)) as unknown as T;
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (typeof value === 'string') {
      if (richTextFields.includes(key)) {
        result[key] = sanitizeHtml(value);
      } else {
        result[key] = sanitizePlainText(value);
      }
    } else if (typeof value === 'object' && value !== null) {
      result[key] = sanitizeUserObject(value, richTextFields);
    } else {
      result[key] = value;
    }
  }

  return result as T;
}
