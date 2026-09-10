/**
 * Zero-asset Web Audio micro-interactions for Firuzo Platform.
 * Adapted from aroux30/site for tactile mobile UX.
 *
 * Uses client-side browser AudioContext oscillator synthesis:
 * - 0 KB network payload (no audio files downloaded).
 * - SSR safe and resilient to browser autoplay policies.
 * - Global mute toggle backed by localStorage.
 */

const STORAGE_KEY = "firuzo_audio_muted";

let globalAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;

  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;

    if (!globalAudioCtx || globalAudioCtx.state === "closed") {
      globalAudioCtx = new AudioContextClass();
    }

    if (globalAudioCtx.state === "suspended") {
      void globalAudioCtx.resume().catch(() => {
        // Silently handle autoplay restrictions
      });
    }

    return globalAudioCtx;
  } catch {
    return null;
  }
}

/**
 * Checks whether audio effects are muted by user preference.
 */
export function isAudioMuted(): boolean {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

/**
 * Sets the global mute preference.
 */
export function setAudioMuted(muted: boolean): void {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, muted ? "true" : "false");
  } catch {
    // Ignore localStorage access errors
  }
}

/**
 * Toggles the audio mute state and returns the new state.
 */
export function toggleAudioMuted(): boolean {
  const next = !isAudioMuted();
  setAudioMuted(next);
  return next;
}

/**
 * Plays a pleasant two-tone harmonic chime (C5 523.25 Hz + E5 659.25 Hz).
 * Best for: Booking confirmation, payment capture, voucher generation.
 */
export function playSuccessChime(): void {
  if (isAudioMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // Tone 1: C5 (523.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(523.25, now);
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Tone 2: E5 (659.25 Hz) - offset by 80ms for a cheerful rising chord
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(659.25, now + 0.08);
    gain2.gain.setValueAtTime(0.15, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.55);
  } catch {
    // Graceful silent fallback if Web Audio is blocked
  }
}

/**
 * Plays a crisp, subtle tap ping (A5 880 Hz) with a triangle wave.
 * Best for: Wishlist/favorite toggle, quick filter chip selection.
 */
export function playTapPing(): void {
  if (isAudioMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(880, now);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  } catch {
    // Graceful silent fallback
  }
}

/**
 * Plays a low double warning tone (220 Hz -> 180 Hz).
 * Best for: Validation error, card limit exceeded notification.
 */
export function playWarningBeep(): void {
  if (isAudioMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.setValueAtTime(180, now + 0.1);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  } catch {
    // Graceful silent fallback
  }
}
