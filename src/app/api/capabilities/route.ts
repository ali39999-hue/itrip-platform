import { NextResponse } from 'next/server';
import { getAllCapabilities, getPublicCapabilitiesSummary } from '@/lib/capabilities';
import type { CapabilityDescriptor } from '@/lib/capabilities';
import { APP_VERSION, COMMIT_SHA } from '@/lib/version';

import faMessages from '../../../../messages/fa.json';
import enMessages from '../../../../messages/en.json';
import arMessages from '../../../../messages/ar.json';
import zhMessages from '../../../../messages/zh.json';
import ruMessages from '../../../../messages/ru.json';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RegistryCopy = {
  name: { fa: string; en: string; ar?: string; zh?: string; ru?: string };
  description: { fa: string; en: string };
  badgeLabel: { fa: string; en: string };
};

// Entries defined without inline localized copy (see CapabilityDescriptor) pull
// their display metadata from the shared catalogs — one source of truth for all
// five locales instead of FA literals inside the client-bundled registry.
const REGISTRY_COPY: Record<string, RegistryCopy | undefined> = (() => {
  const carriers = [faMessages, enMessages, arMessages, zhMessages, ruMessages];
  const out: Record<string, RegistryCopy | undefined> = {};
  for (const c of carriers) {
    const ns = (c as { CapabilityRegistry?: Record<string, RegistryCopy> }).CapabilityRegistry;
    if (!ns) continue;
    for (const [suffix, copy] of Object.entries(ns)) {
      out[`services.${suffix}`] = copy;
    }
  }
  return out;
})();

function withRegistryCopy(descriptor: CapabilityDescriptor): CapabilityDescriptor {
  const copy = REGISTRY_COPY[descriptor.key];
  if (!copy || descriptor.name) return descriptor;
  return { ...descriptor, name: copy.name, description: copy.description, badgeLabel: copy.badgeLabel };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const detail = searchParams.get('detail') === 'full';

  if (detail) {
    const all = getAllCapabilities();
    const enriched = Object.fromEntries(
      Object.entries(all).map(([key, descriptor]) => [key, withRegistryCopy(descriptor)])
    );
    return NextResponse.json({
      version: APP_VERSION,
      commitSha: COMMIT_SHA,
      timestamp: new Date().toISOString(),
      capabilities: enriched,
    });
  }

  return NextResponse.json({
    version: APP_VERSION,
    commitSha: COMMIT_SHA,
    timestamp: new Date().toISOString(),
    capabilities: getPublicCapabilitiesSummary(),
  });
}
