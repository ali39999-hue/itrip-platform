import { describe, it, expect } from 'vitest';
import { parseNaturalQuery } from './natural-query';

describe('parseNaturalQuery: trip type (round trip vs one way)', () => {
  it('detects Persian round-trip phrasing', () => {
    expect(parseNaturalQuery('یک سفر ۵ روزه به استانبول رفت و برگشت')?.tripType).toBe('round');
    expect(parseNaturalQuery('دبی دو طرفه با بودجه متوسط')?.tripType).toBe('round');
    expect(parseNaturalQuery('سفر خانوادگی به تفلیس با برگشت')?.tripType).toBe('round');
  });

  it('detects one-way phrasing', () => {
    expect(parseNaturalQuery('یک طرفه به استانبول، ۴ روزه')?.tripType).toBe('oneway');
    expect(parseNaturalQuery('فقط رفت به دبی')?.tripType).toBe('oneway');
    expect(parseNaturalQuery('one way trip to Istanbul 5 days')?.tripType).toBe('oneway');
  });

  it('detects English round-trip phrasing and does not shadow days parsing', () => {
    const parsed = parseNaturalQuery('round trip to Istanbul for 5 days');
    expect(parsed?.tripType).toBe('round');
    expect(parsed?.days).toBe(5);
    expect(parsed?.dest).toBe('turkey');
  });

  it('leaves tripType undefined when not mentioned', () => {
    expect(parseNaturalQuery('یک سفر ۴ روزه دونفره به استانبول')?.tripType).toBeUndefined();
  });
});
