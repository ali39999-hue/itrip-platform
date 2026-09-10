// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  isAudioMuted,
  setAudioMuted,
  toggleAudioMuted,
  playSuccessChime,
  playTapPing,
  playWarningBeep,
} from "./audio-effects";

describe("audio-effects micro-interactions", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("handles mute preferences via localStorage", () => {
    expect(isAudioMuted()).toBe(false);

    setAudioMuted(true);
    expect(isAudioMuted()).toBe(true);

    const toggled = toggleAudioMuted();
    expect(toggled).toBe(false);
    expect(isAudioMuted()).toBe(false);
  });

  it("does not throw in headless or SSR environments where AudioContext is missing", () => {
    expect(() => playSuccessChime()).not.toThrow();
    expect(() => playTapPing()).not.toThrow();
    expect(() => playWarningBeep()).not.toThrow();
  });

  it("synthesizes audio without errors when AudioContext is mocked", () => {
    const startMock = vi.fn();
    const stopMock = vi.fn();
    const connectMock = vi.fn();
    const setValueAtTimeMock = vi.fn();
    const exponentialRampMock = vi.fn();

    class MockAudioContext {
      currentTime = 0;
      state = "running";
      destination = {};
      createOscillator() {
        return {
          type: "sine",
          frequency: { setValueAtTime: setValueAtTimeMock },
          connect: connectMock,
          start: startMock,
          stop: stopMock,
        };
      }
      createGain() {
        return {
          gain: {
            setValueAtTime: setValueAtTimeMock,
            exponentialRampToValueAtTime: exponentialRampMock,
          },
          connect: connectMock,
        };
      }
    }

    vi.stubGlobal("AudioContext", MockAudioContext);

    expect(() => playSuccessChime()).not.toThrow();
    expect(() => playTapPing()).not.toThrow();
    expect(() => playWarningBeep()).not.toThrow();

    expect(startMock).toHaveBeenCalled();
    expect(stopMock).toHaveBeenCalled();

    vi.unstubAllGlobals();
  });
});
