import { listContentPages, getContentPage } from '@/actions/business-content-ops';
import { requirePermission } from '@/domains/identity/permission-service';
import { ContentEditorClient, type ContentPageRow } from './ContentEditorClient';

export default async function AdminBusinessContentPage() {
  // Fail closed: only content managers reach the editor.
  let allowed = true;
  try {
    await requirePermission('content:manage');
  } catch {
    allowed = false;
  }

  if (!allowed) {
    return (
      <div className="rounded-2xl border border-border/80 bg-surface p-6">
        <h1 className="font-bold text-text-title">دسترسی غیرمجاز</h1>
        <p className="mt-2 text-sm text-text-muted">
          برای مدیریت محتوای تخصصی به نقش ویراستار محتوا نیاز دارید.
        </p>
      </div>
    );
  }

  const result = await listContentPages();
  const raw = (result.success && result.pages ? result.pages : []) as Array<{
    id: string;
    slug: string;
    locale: string;
    title: string;
    status: string;
    scheduledAt: Date | null;
    sections: unknown;
    seo: unknown;
    _count: { revisions: number };
  }>;

  const rows: ContentPageRow[] = raw.map((p) => ({
    id: p.id,
    slug: p.slug,
    locale: p.locale,
    title: p.title,
    status: p.status,
    scheduledAt: p.scheduledAt ? new Date(p.scheduledAt).toISOString() : null,
    revisionCount: p._count?.revisions ?? 0,
    sections: (p.sections as ContentPageRow['sections']) || [],
    seo: (p.seo as Record<string, unknown> | null) ?? null,
  }));

  // Revisions for the most recently updated page (initial editor state) —
  // fetched through the guarded server action, never direct Prisma (BASE-006).
  let revisions: Array<{ id: string; note: string | null; createdAt: string }> = [];
  if (rows[0]) {
    const detail = await getContentPage(rows[0].id);
    if (detail.success && detail.page?.revisions) {
      revisions = (detail.page.revisions as Array<{
        id: string;
        note: string | null;
        createdAt: Date;
      }>).map((r) => ({
        id: r.id,
        note: r.note,
        createdAt: new Date(r.createdAt).toISOString(),
      }));
    }
  }

  return <ContentEditorClient initialPages={rows} initialDetail={rows[0] ?? null} revisions={revisions} />;
}
