'use client';

import * as React from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'start' | 'end';
}

export function Tooltip({ content, children, side = 'top' }: TooltipProps) {
  const [visible, setVisible] = React.useState(false);

  const sideStyles = {
    top: 'bottom-full start-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full start-1/2 -translate-x-1/2 mt-2',
    start: 'top-1/2 end-full -translate-y-1/2 me-2',
    end: 'top-1/2 start-full -translate-y-1/2 ms-2',
  };

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          role="tooltip"
          className={`absolute z-[110] px-2.5 py-1 text-[11px] font-bold text-surface bg-ink/90 backdrop-blur-sm rounded-lg shadow-elev-2 whitespace-nowrap animate-in fade-in zoom-in-95 duration-150 pointer-events-none ${sideStyles[side]}`}
        >
          {content}
        </div>
      )}
    </div>
  );
}
