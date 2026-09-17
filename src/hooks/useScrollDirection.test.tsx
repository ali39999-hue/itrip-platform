// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useScrollDirection } from './useScrollDirection';

describe('useScrollDirection', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => window.setTimeout(() => cb(0), 16));
    vi.stubGlobal('cancelAnimationFrame', (id: number) => window.clearTimeout(id));
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });
  function scrollTo(y: number) {
    act(() => {
      Object.defineProperty(window, 'scrollY', { configurable: true, value: y });
      window.dispatchEvent(new Event('scroll'));
      vi.advanceTimersByTime(20);
    });
  }
  it('shows controls initially and near the top', () => {
    const { result } = renderHook(() => useScrollDirection());
    expect(result.current).toBe('up');
    scrollTo(100);
    expect(result.current).toBe('up');
  });
  it('hides on downward travel and restores on upward travel', () => {
    const { result } = renderHook(() => useScrollDirection());
    scrollTo(800);
    expect(result.current).toBe('down');
    scrollTo(760);
    expect(result.current).toBe('up');
  });
  it('ignores jitter but accumulates small movements', () => {
    const { result } = renderHook(() => useScrollDirection());
    scrollTo(800);
    scrollTo(797);
    expect(result.current).toBe('down');
    scrollTo(785);
    expect(result.current).toBe('up');
  });
  it('cancels queued work on unmount', () => {
    const cancel = vi.spyOn(window, 'cancelAnimationFrame');
    const { unmount } = renderHook(() => useScrollDirection());
    act(() => window.dispatchEvent(new Event('scroll')));
    unmount();
    expect(cancel).toHaveBeenCalled();
  });
});
