import { NextResponse } from 'next/server';
import { requirePermission } from '@/domains/identity/permission-service';
import type { ERPPermission } from '@/domains/identity/permissions';

/**
 * Route-level guard for Firuzo Business (specialist Child) operator endpoints.
 * Fails closed: no session → 401, missing permission → 403.
 * Returns a NextResponse error, or null when the caller is authorized.
 */
export async function requireBusinessPermission(
  permission: ERPPermission
): Promise<NextResponse | null> {
  try {
    await requirePermission(permission);
    return null;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (/unauthorized|no active authenticated principal|principal .* not found/i.test(message)) {
      return NextResponse.json(
        { success: false, error: 'Authentication required', code: 'unauthorized' },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { success: false, error: message, code: 'forbidden' },
      { status: 403 }
    );
  }
}

/**
 * Object-level access check for a business request (T0804, roadmap §21).
 * - Requests created by an authenticated user: only the owner or a staff
 *   principal holding `business:request:review` may read/mutate them.
 * - Guest-created requests (createdById null, Phase-1 guest funnel): access
 *   relies on the unguessable request id until login binding ships.
 * Returns a NextResponse error, or null when access is allowed.
 */
export async function requireRequestAccess(
  request: { createdById?: string | null } | null | undefined
): Promise<NextResponse | null> {
  if (!request?.createdById) return null; // guest-created → id-based access

  const { safeAuth } = await import('@/auth');
  const session = await safeAuth();
  if (session?.user?.id === request.createdById) return null; // owner

  try {
    await requirePermission('business:request:review');
    return null; // staff may operate on any request
  } catch {
    return NextResponse.json(
      { success: false, error: 'Not allowed to access this request', code: 'forbidden' },
      { status: 403 }
    );
  }
}

/**
 * Resolves the authenticated session user id for ownership binding on create.
 * Returns null for anonymous callers (guest funnel stays allowed in Phase 1).
 */
export async function getSessionUserId(): Promise<string | null> {
  const { safeAuth } = await import('@/auth');
  const session = await safeAuth();
  return session?.user?.id ?? null;
}

