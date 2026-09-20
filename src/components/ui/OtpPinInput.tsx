'use client';

import React from 'react';
import { OtpField } from './otp-field';

export interface OtpPinInputProps {
  length?: number;
  value: string;
  onChange: (val: string) => void;
  onComplete?: (val: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

/**
 * @deprecated Use `OtpField` from `@/components/ui/otp-field` directly.
 * Kept for backwards compatibility.
 */
export function OtpPinInput({
  length = 4,
  value,
  onChange,
  onComplete,
  disabled = false,
}: OtpPinInputProps) {
  return (
    <div className="flex justify-center" dir="ltr">
      <OtpField
        length={length}
        value={value}
        onChange={onChange}
        onComplete={onComplete}
        disabled={disabled}
        size="md"
      />
    </div>
  );
}
