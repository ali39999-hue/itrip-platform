import { NextRequest, NextResponse } from 'next/server';
import { ContentDomainService } from '@/domains/content/ContentDomainService';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const country = searchParams.get('country') || undefined;
    const experiences = await ContentDomainService.getExperiences(country, true);
    
    const data = (experiences || []).map((exp: Record<string, unknown>) => ({
      id: String(exp.id),
      countryId: String(exp.countryId),
      category: String(exp.category),
      title: String(exp.title),
      titleEn: String(exp.titleEn || ''),
      desc: String(exp.desc || ''),
      descEn: String(exp.descEn || ''),
      where: String(exp.where || ''),
      whereEn: String(exp.whereEn || ''),
      when: String(exp.when || ''),
      whenEn: String(exp.whenEn || ''),
      fromPrice: typeof exp.fromPrice === 'object' && exp.fromPrice !== null ? Number(exp.fromPrice.toString()) : (Number(exp.fromPrice) || 0),
      image: exp.image ? String(exp.image) : null,
      isActive: Boolean(exp.isActive),
    }));

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to fetch experiences';
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}
