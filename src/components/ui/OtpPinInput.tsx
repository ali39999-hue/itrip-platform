'use client';

import React, { useRef, useEffect } from 'react';

interface OtpPinInputProps {
  length?: number;
  value: string;
  onChange: (val: string) => void;
  onComplete?: (val: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

export function OtpPinInput({
  length = 4,
  value,
  onChange,
  onComplete,
  disabled = false,
  autoFocus = true,
}: OtpPinInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Split value into array of single chars
  const digits = Array.from({ length }, (_, i) => value[i] || '');

  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  const toAsciiDigit = (char: string): string => {
    const p = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    const a = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    for (let i = 0; i < 10; i++) {
      if (char === p[i] || char === a[i]) return String(i);
    }
    return char;
  };

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const cleanChars = rawVal
      .split('')
      .map(toAsciiDigit)
      .filter((c) => /^\d$/.test(c));

    if (cleanChars.length === 0) {
      // Clear current digit
      const next = [...digits];
      next[index] = '';
      const newVal = next.join('');
      onChange(newVal);
      return;
    }

    if (cleanChars.length === 1) {
      const next = [...digits];
      next[index] = cleanChars[0];
      const newVal = next.join('');
      onChange(newVal);

      if (index < length - 1 && inputRefs.current[index + 1]) {
        inputRefs.current[index + 1]?.focus();
      }

      if (newVal.length === length && onComplete) {
        onComplete(newVal);
      }
    } else {
      // Multiple digits entered/pasted into single box
      handlePasteString(cleanChars.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
        const next = [...digits];
        next[index - 1] = '';
        onChange(next.join(''));
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (index > 0) inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (index < length - 1) inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePasteString = (pasted: string) => {
    const clean = pasted
      .split('')
      .map(toAsciiDigit)
      .filter((c) => /^\d$/.test(c))
      .slice(0, length)
      .join('');

    onChange(clean);

    const focusIdx = Math.min(clean.length, length - 1);
    inputRefs.current[focusIdx]?.focus();

    if (clean.length === length && onComplete) {
      onComplete(clean);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const data = e.clipboardData.getData('text');
    handlePasteString(data);
  };

  return (
    <div className="flex items-center justify-center gap-3 dir-ltr" dir="ltr">
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            inputRefs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          disabled={disabled}
          value={digits[i] || ''}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className={`w-14 h-16 sm:w-16 sm:h-18 rounded-2xl border text-center font-mono text-3xl font-black transition-all shadow-xs outline-none ${
            digits[i]
              ? 'border-brand bg-brand/5 text-brand-dark ring-2 ring-brand/20'
              : 'border-line bg-soft/60 text-ink hover:border-brand/40 focus:border-brand focus:bg-surface focus:ring-4 focus:ring-brand/15'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
      ))}
    </div>
  );
}
