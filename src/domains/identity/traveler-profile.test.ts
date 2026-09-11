import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { TravelerProfileService } from './TravelerProfileService';

describe('TravelerProfileService - Domain Architecture Suite', () => {
  const suffix = `trav_${Date.now().toString(36)}_${randomBytes(3).toString('hex')}`;
  let userAId = '';
  let userBId = '';
  let profileAId = '';

  beforeAll(async () => {
    const userA = await prisma.user.create({
      data: {
        email: `usera_${suffix}@firuzo.com`,
        phone: `+98912${Math.floor(1000000 + Math.random() * 9000000)}`,
        name: 'User A',
      },
    });
    userAId = userA.id;

    const userB = await prisma.user.create({
      data: {
        email: `userb_${suffix}@firuzo.com`,
        phone: `+98912${Math.floor(1000000 + Math.random() * 9000000)}`,
        name: 'User B',
      },
    });
    userBId = userB.id;
  });

  afterAll(async () => {
    try {
      if (profileAId) {
        await prisma.travelDocument.deleteMany({ where: { travelerProfileId: profileAId } });
        await prisma.travelerProfile.deleteMany({ where: { id: profileAId } });
      }
      if (userAId || userBId) {
        await prisma.user.deleteMany({ where: { id: { in: [userAId, userBId] } } });
      }
    } catch {
      // Ignore cleanup error
    }
  });

  it('should create a companion traveler profile for User A', async () => {
    const profile = await TravelerProfileService.upsertTravelerProfile(userAId, {
      firstName: 'سارا',
      lastName: 'احمدی',
      nationalId: '0012345678',
      dateOfBirth: '1995-05-12',
      gender: 'FEMALE',
      nationality: 'IR',
    });

    expect(profile).toBeDefined();
    expect(profile.id).toBeDefined();
    expect(profile.userId).toBe(userAId);
    expect(profile.firstName).toBe('سارا');
    expect(profile.lastName).toBe('احمدی');
    profileAId = profile.id;
  });

  it('should prevent User B from reading User A traveler profile (IDOR protection)', async () => {
    const profile = await TravelerProfileService.getTravelerProfileById(userBId, profileAId);
    expect(profile).toBeNull();
  });

  it('should prevent User B from modifying User A traveler profile', async () => {
    await expect(
      TravelerProfileService.upsertTravelerProfile(userBId, {
        id: profileAId,
        firstName: 'Hacked',
        lastName: 'Name',
      })
    ).rejects.toThrow();
  });

  it('should add a passport document with 6-month validity diagnostics', async () => {
    // Expiry date far in the future (> 1 year)
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 2);
    const expiresAt = futureDate.toISOString().slice(0, 10);

    const doc = await TravelerProfileService.addTravelDocument(userAId, profileAId, {
      type: 'PASSPORT',
      documentNumber: 'A98765432',
      issuingCountry: 'IR',
      expiresAt,
      holderName: 'Sara Ahmadi',
    });

    expect(doc).toBeDefined();
    expect(doc.type).toBe('PASSPORT');
    expect(doc.validity).toBeDefined();
    expect(doc.validity?.isValidForTravel).toBe(true);
    expect(doc.validity?.status).toBe('VALID');
  });

  it('should warn when passport has less than 6 months validity', async () => {
    // Expiry date only 60 days in the future (< 180 days)
    const nearDate = new Date();
    nearDate.setDate(nearDate.getDate() + 60);
    const expiresAt = nearDate.toISOString().slice(0, 10);

    const doc = await TravelerProfileService.addTravelDocument(userAId, profileAId, {
      type: 'PASSPORT',
      documentNumber: 'B11223344',
      issuingCountry: 'IR',
      expiresAt,
      holderName: 'Sara Ahmadi Expiring',
    });

    expect(doc.validity?.isValidForTravel).toBe(false);
    expect(doc.validity?.status).toBe('INSUFFICIENT_SIX_MONTHS');
  });

  it('should list all traveler profiles for User A including documents', async () => {
    const profiles = await TravelerProfileService.getTravelerProfiles(userAId);
    expect(profiles.length).toBeGreaterThanOrEqual(1);
    const found = profiles.find((p) => p.id === profileAId);
    expect(found).toBeDefined();
    expect(found?.documents.length).toBe(2);
    expect(found?.primaryPassport).toBeDefined();
  });

  it('should safely delete traveler profile and cascade documents', async () => {
    const deleted = await TravelerProfileService.deleteTravelerProfile(userAId, profileAId);
    expect(deleted).toBe(true);

    const docs = await prisma.travelDocument.findMany({ where: { travelerProfileId: profileAId } });
    expect(docs.length).toBe(0);

    profileAId = ''; // Mark cleaned up
  });
});
