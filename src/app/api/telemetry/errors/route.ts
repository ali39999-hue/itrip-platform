import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { z } from 'zod';
import { ErrorTrackerService, ErrorSeverity, ErrorSource } from '@/domains/observability/ErrorTrackerService';
import { resolveAuthSigningSecret } from '@/lib/security/secrets';

// In-memory rate limiting map for error ingestion: IP -> timestamps[]
const rateLimitMap = new Map<string, number[]>();
const MAX_ERRORS_PER_MINUTE = 30;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - 60 * 1000;
  const timestamps = rateLimitMap.get(ip) || [];
  const recent = timestamps.filter((t) => t > windowStart);

  if (recent.length >= MAX_ERRORS_PER_MINUTE) {
    return true;
  }

  recent.push(now);
  rateLimitMap.set(ip, recent);

  // Clean up old entries periodically
  if (rateLimitMap.size > 5000) {
    for (const [key, times] of rateLimitMap.entries()) {
      if (times.every((t) => t <= windowStart)) {
        rateLimitMap.delete(key);
      }
    }
  }

  return false;
}

const errorIngestSchema = z.object({
  message: z.string().min(1).max(4000),
  stackTrace: z.string().max(10000).optional().nullable(),
  endpoint: z.string().max(500).optional().nullable(),
  source: z.enum([
    'SERVER_ACTION',
    'API_ROUTE',
    'DB_PRISMA',
    'CLIENT_REACT',
    'MIDDLEWARE',
    'CRON',
    'EXTERNAL_API',
    'SECURITY',
  ]).optional().default('CLIENT_REACT'),
  level: z.enum(['CRITICAL', 'ERROR', 'WARN', 'INFO']).optional().default('ERROR'),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    if (isRateLimited(ip)) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const parsed = errorIngestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid error report schema', details: parsed.error.issues },
        { status: 422 },
      );
    }

    // Try to extract session details if logged in. SEC-014: no published JWT
    // fallback secret — when AUTH_SECRET is missing we simply skip session
    // enrichment (fail closed) instead of verifying tokens with a public key.
    let userId: string | null = null;
    let userRole: string | null = null;
    try {
      const authSecret = resolveAuthSigningSecret('jwt-session');
      const token = authSecret ? await getToken({ req, secret: authSecret }) : null;
      if (token) {
        userId = token.sub ? String(token.sub) : null;
        userRole = token.role ? String(token.role) : null;
      }
    } catch {
      // Session parsing non-critical
    }

    const { message, stackTrace, endpoint, source, level, metadata } = parsed.data;

    const logId = await ErrorTrackerService.captureError({
      message,
      stackTrace,
      endpoint: endpoint || req.headers.get('referer') || null,
      source: source as ErrorSource,
      level: level as ErrorSeverity,
      userId,
      userRole,
      ipAddress: ip,
      userAgent,
      metadata: metadata || undefined,
    });

    return NextResponse.json({ success: true, logId }, { status: 201 });
  } catch (err: unknown) {
    console.error('Failed to ingest telemetry error:', err);
    return NextResponse.json({ error: 'Internal logging error' }, { status: 500 });
  }
}
