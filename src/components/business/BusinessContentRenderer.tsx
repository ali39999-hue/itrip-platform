import type { SectionEntry } from '@/domains/business/core/BusinessContentService';

/**
 * T0502 — shared section renderer for the Child CMS. Used by the admin preview
 * and the public landing route so what the editor previews is exactly what the
 * visitor sees. RTL-first, token-driven per docs/DESIGN_SYSTEM.md.
 */

interface SectionProps {
  section: SectionEntry;
  index: number;
}

function HeroBanner({ section }: SectionProps) {
  const { title, subtitle, ctaLabel, ctaUrl, bgImageUrl } = section.props as {
    title?: string;
    subtitle?: string;
    ctaLabel?: string;
    ctaUrl?: string;
    bgImageUrl?: string;
  };
  return (
    <section className="relative overflow-hidden rounded-2xl border border-border/80 bg-surface">
      {bgImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={bgImageUrl} alt="" className="h-56 w-full object-cover opacity-90" />
      ) : (
        <div className="h-2 w-full bg-gradient-to-l from-[var(--fz-brand)] to-[var(--fz-action)]" />
      )}
      <div className="p-6">
        <h2 className="text-2xl font-bold text-text-title">{title}</h2>
        {subtitle && <p className="mt-2 leading-relaxed text-text-body">{subtitle}</p>}
        {ctaLabel && ctaUrl && (
          <a
            href={ctaUrl}
            className="mt-4 inline-flex min-h-[44px] items-center rounded-xl bg-[var(--fz-action)] px-4 font-medium text-white transition active:scale-[0.98]"
          >
            {ctaLabel}
          </a>
        )}
      </div>
    </section>
  );
}

function ItineraryTimeline({ section }: SectionProps) {
  const days = (section.props.days as Array<{ dayNumber?: number; title?: string; description?: string }>) || [];
  return (
    <section className="rounded-2xl border border-border/80 bg-surface p-6">
      <h3 className="mb-4 font-bold text-text-title">برنامه روزانه</h3>
      <ol className="space-y-4">
        {days.map((d, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--fz-surface-sub)] text-sm font-bold text-text-body">
              {d.dayNumber ?? i + 1}
            </span>
            <div>
              <p className="font-medium text-text-body">{d.title}</p>
              {d.description && <p className="text-sm leading-relaxed text-text-muted">{d.description}</p>}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function IncludedServices({ section }: SectionProps) {
  const items = (section.props.items as string[]) || [];
  const excluded = (section.props.excluded as string[]) || [];
  return (
    <section className="grid gap-4 rounded-2xl border border-border/80 bg-surface p-6 md:grid-cols-2">
      <div>
        <h3 className="mb-3 font-bold text-text-title">شامل</h3>
        <ul className="space-y-2">
          {items.map((it, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-text-body">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[var(--fz-action)]" />
              {it}
            </li>
          ))}
        </ul>
      </div>
      {excluded.length > 0 && (
        <div>
          <h3 className="mb-3 font-bold text-text-title">شامل نمی‌شود</h3>
          <ul className="space-y-2">
            {excluded.map((it, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-text-muted">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-border" />
                {it}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function FaqAccordion({ section }: SectionProps) {
  const questions = (section.props.questions as Array<{ q?: string; a?: string }>) || [];
  return (
    <section className="rounded-2xl border border-border/80 bg-surface p-6">
      <h3 className="mb-4 font-bold text-text-title">سوالات متداول</h3>
      <div className="space-y-3">
        {questions.map((qa, i) => (
          <details key={i} className="rounded-xl border border-border/60 p-4">
            <summary className="min-h-[44px] cursor-pointer font-medium text-text-body">{qa.q}</summary>
            <p className="mt-2 text-sm leading-relaxed text-text-muted">{qa.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

const RENDERERS: Record<string, (p: SectionProps) => React.ReactNode> = {
  hero_banner: HeroBanner,
  itinerary_timeline: ItineraryTimeline,
  included_services: IncludedServices,
  faq_accordion: FaqAccordion,
};

export function BusinessContentRenderer({ sections }: { sections: SectionEntry[] }) {
  return (
    <div className="space-y-6">
      {sections.map((section, index) => {
        const Renderer = RENDERERS[section.key];
        if (!Renderer) return null;
        return <Renderer key={index} section={section} index={index} />;
      })}
    </div>
  );
}
