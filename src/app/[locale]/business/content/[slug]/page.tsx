import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { BusinessContentService } from '@/domains/business/core/BusinessContentService';
import { BusinessContentRenderer } from '@/components/business/BusinessContentRenderer';
import type { SectionEntry } from '@/domains/business/core/BusinessContentService';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await BusinessContentService.getPublished(slug, 'fa');
  if (!page) return { title: 'صفحه یافت نشد' };
  const seo = (page.seo as {
    metaTitle?: string;
    metaDescription?: string;
    canonicalUrl?: string;
    ogImage?: string;
  } | null) || {};
  return {
    title: seo.metaTitle || page.title,
    description: seo.metaDescription,
    alternates: seo.canonicalUrl ? { canonical: seo.canonicalUrl } : undefined,
    openGraph: {
      title: seo.metaTitle || page.title,
      description: seo.metaDescription,
      images: seo.ogImage ? [seo.ogImage] : undefined,
    },
  };
}

export default async function BusinessContentPageView({ params }: PageProps) {
  const { slug } = await params;
  const page = await BusinessContentService.getPublished(slug, 'fa');
  if (!page) notFound();

  const sections = (page.sections as unknown as SectionEntry[]) || [];

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[env(safe-area-inset-top)]">
      <header>
        <p className="text-sm font-medium text-[var(--fz-brand)]">فیروزو بیزنس</p>
        <h1 className="mt-1 text-3xl font-bold leading-relaxed text-text-title">{page.title}</h1>
      </header>
      <BusinessContentRenderer sections={sections} />
    </main>
  );
}
