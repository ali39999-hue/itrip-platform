import { describe, it, expect, afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';
import { BusinessDomainService } from './BusinessDomainService';

/**
 * T0401 QA — vertical taxonomy on the specialist catalog (§36 scale layer).
 * The first stable vertical (technology) now coexists with a second vertical
 * (health_wellness) through an explicit, filterable dimension.
 * Lives in core/ alongside the other domain-QA suites (ESLint boundary).
 */
describe('QA — vertical taxonomy (T0401)', () => {
  const suffix = `vtx_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const packageIds: string[] = [];

  afterAll(async () => {
    await prisma.businessDeparture.deleteMany({ where: { packageId: { in: packageIds } } });
    await prisma.businessTourPackage.deleteMany({
      where: { slug: { endsWith: suffix } },
    });
  });

  async function seedPackage(vertical: string, slug: string) {
    const pkg = await prisma.businessTourPackage.create({
      data: {
        slug: `${slug}-${suffix}`,
        title: `تور ${vertical}`,
        destination: 'تست',
        durationDays: 3,
        basePrice: 1_000_000,
        includes: [],
        requiredDocs: [],
        status: 'PUBLISHED',
        vertical,
        departures: {
          create: [{ departDate: new Date('2027-05-01'), returnDate: new Date('2027-05-04'), capacity: 5 }],
        },
      },
      include: { departures: true },
    });
    packageIds.push(pkg.id);
    return pkg;
  }

  it('defaults new packages to the technology vertical', async () => {
    const pkg = await prisma.businessTourPackage.create({
      data: {
        slug: `vtx-default-${suffix}`,
        title: 'تور بدون vertical صریح',
        destination: 'تست',
        durationDays: 1,
        basePrice: 100,
        includes: [],
        requiredDocs: [],
        status: 'PUBLISHED',
      },
    });
    packageIds.push(pkg.id);
    expect(pkg.vertical).toBe('technology');
  });

  it('filters by vertical and returns the vertical field in listings', async () => {
    await seedPackage('technology', 'vtx-tech');
    await seedPackage('health_wellness', 'vtx-well');
    const techSlug = `vtx-tech-${suffix}`;
    const wellSlug = `vtx-well-${suffix}`;

    const wellness = await BusinessDomainService.listPackages({ vertical: 'health_wellness' });
    const wellnessInTest = wellness.filter((p) => p.slug === wellSlug);
    expect(wellnessInTest.length).toBe(1);
    expect(wellnessInTest[0].vertical).toBe('health_wellness');

    const technology = await BusinessDomainService.listPackages({ vertical: 'technology' });
    const techInTest = technology.filter((p) => p.slug === techSlug);
    expect(techInTest.length).toBe(1);
    expect(techInTest[0].vertical).toBe('technology');

    // Omitting the filter returns all verticals (multi-vertical surface).
    const all = await BusinessDomainService.listPackages();
    const allInTest = all.filter((p) => p.slug === techSlug || p.slug === wellSlug);
    expect(allInTest.length).toBe(2);
  });
});
