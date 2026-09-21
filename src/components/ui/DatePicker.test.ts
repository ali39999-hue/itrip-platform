import { describe, it, expect } from 'vitest';
import { resolveEffectiveBoundary, clampDateToBoundary } from './DatePicker';

describe('DatePicker Boundary & Date Clamping Logic', () => {
  it('returns undefined for empty, undefined, or invalid inputs', () => {
    expect(clampDateToBoundary(undefined)).toBeUndefined();
    expect(clampDateToBoundary('')).toBeUndefined();
    expect(clampDateToBoundary('not-a-valid-date')).toBeUndefined();
  });

  it('clamps past dates to today when minDate is not specified', () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pastDate = '2020-01-15';
    const clamped = clampDateToBoundary(pastDate);

    expect(clamped).toBeDefined();
    expect(clamped?.getTime()).toBe(today.getTime());
  });

  it('clamps to future minDate when value is in the past', () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const futureMinDate = new Date(today);
    futureMinDate.setDate(today.getDate() + 5);

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const clamped = clampDateToBoundary(yesterdayStr, futureMinDate);

    expect(clamped).toBeDefined();
    expect(clamped?.getTime()).toBe(futureMinDate.getTime());
    // Crucially: it clamped to futureMinDate, NOT today
    expect(clamped?.getTime()).toBeGreaterThan(today.getTime());
  });

  it('clamps to future minDate when value is after today but before minDate', () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const futureMinDate = new Date(today);
    futureMinDate.setDate(today.getDate() + 7);

    const intermediateDate = new Date(today);
    intermediateDate.setDate(today.getDate() + 3);
    const intermediateStr = intermediateDate.toISOString().split('T')[0];

    const clamped = clampDateToBoundary(intermediateStr, futureMinDate);

    expect(clamped).toBeDefined();
    expect(clamped?.getTime()).toBe(futureMinDate.getTime());
  });

  it('keeps value intact when it is equal to or after minDate', () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const futureMinDate = new Date(today);
    futureMinDate.setDate(today.getDate() + 5);

    const validFuture = new Date(today);
    validFuture.setDate(today.getDate() + 10);
    const validFutureStr = validFuture.toISOString().split('T')[0];

    const clamped = clampDateToBoundary(validFutureStr, futureMinDate);

    expect(clamped).toBeDefined();
    expect(clamped?.getTime()).toBe(new Date(`${validFutureStr}T00:00:00`).getTime());
  });

  it('correctly resolves boundary from string, number, and DateObject inputs', () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const formatLocalIso = (d: Date) =>
      [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');

    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + 4);
    const futureIso = formatLocalIso(futureDate);

    // String input
    const boundaryFromString = resolveEffectiveBoundary(futureIso);
    expect(boundaryFromString.boundary.getTime()).toBe(futureDate.getTime());

    // Number timestamp input
    const boundaryFromNum = resolveEffectiveBoundary(futureDate.getTime());
    expect(boundaryFromNum.boundary.getTime()).toBe(futureDate.getTime());

    // Mock DateObject with toDate()
    const mockDateObj = {
      toDate: () => new Date(futureDate.getTime()),
    };
    const boundaryFromObj = resolveEffectiveBoundary(mockDateObj as unknown as Parameters<typeof resolveEffectiveBoundary>[0]);
    expect(boundaryFromObj.boundary.getTime()).toBe(futureDate.getTime());
  });
});
