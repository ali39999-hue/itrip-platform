'use client';

import * as React from 'react';

/**
 * Accessible focus trap for dialogs and bottom sheets
 * (UX skill: React Aria–style keyboard interaction, dependency-free).
 *
 * - Moves focus into the container on open, restores it on close.
 * - Wraps Tab / Shift+Tab inside the container.
 * - Calls `onEscape` on Escape (parent decides how to close).
 * - No-ops on the server and when `active` is false.
 */

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), ' +
  'input:not([disabled]), select:not([disabled]), ' +
  '[tabindex]:not([tabindex="-1"])';

function focusablesIn(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true',
  );
}

export function useFocusTrap<T extends HTMLElement>(
  active: boolean,
  opts: {
    initialFocusRef?: React.RefObject<HTMLElement | null>;
    onEscape?: () => void;
  } = {},
) {
  const containerRef = React.useRef<T | null>(null);
  const { initialFocusRef, onEscape } = opts;
  const onEscapeRef = React.useRef(onEscape);
  React.useEffect(() => {
    onEscapeRef.current = onEscape;
  }, [onEscape]);

  React.useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    const previouslyFocused =
      typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null;

    // Initial focus: explicit target → first focusable → container itself.
    const initial =
      initialFocusRef?.current && container.contains(initialFocusRef.current)
        ? initialFocusRef.current
        : focusablesIn(container)[0];
    if (initial) {
      initial.focus({ preventScroll: true });
    } else {
      if (!container.hasAttribute('tabindex')) container.setAttribute('tabindex', '-1');
      container.focus({ preventScroll: true });
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onEscapeRef.current?.();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusablesIn(container as HTMLElement);
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      // Return focus so keyboard/screen-reader users land back where they were.
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [active, initialFocusRef]);

  return containerRef;
}
