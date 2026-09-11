'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { useFocusTrap } from '@/hooks/useFocusTrap';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

const DialogContext = React.createContext<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>({ open: false, onOpenChange: () => {} });

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  React.useEffect(() => {
    // Lock scroll while open. Keyboard handling (Escape + Tab wrap) lives in
    // DialogContent via useFocusTrap so focus is always managed together.
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open ]);

  return (
    <DialogContext.Provider value={{ open, onOpenChange }}>
      {children}
    </DialogContext.Provider>
  );
}

export function DialogContent({
  children,
  className = '',
  closeAriaLabel = 'Close',
}: {
  children: React.ReactNode;
  className?: string;
  closeAriaLabel?: string;
}) {
  const { open, onOpenChange } = React.useContext(DialogContext);
  const panelRef = useFocusTrap<HTMLDivElement>(open, {
    onEscape: () => onOpenChange(false),
  });

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-ink/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={() => onOpenChange(false)}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        className={`relative w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-surface border-t sm:border border-line p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pb-6 shadow-elev-3 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom sm:slide-in-from-none sm:zoom-in-95 duration-200 ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sm:hidden w-12 h-1.5 rounded-full bg-line/80 mx-auto -mt-2 mb-4" />
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute top-3 end-3 min-w-[44px] min-h-[44px] rounded-full text-sub hover:text-ink hover:bg-line/40 grid place-items-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          aria-label={closeAriaLabel}
        >
          <div className="w-8 h-8 rounded-full bg-soft grid place-items-center">
            <X size={16} />
          </div>
        </button>
        {children}
      </div>
    </div>
  );
}

export function DialogHeader({
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`flex flex-col space-y-1.5 text-start pe-8 mb-4 ${className}`}
      {...props}
    />
  );
}

export function DialogTitle({
  className = '',
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={`text-lg font-black text-ink leading-none tracking-tight ${className}`}
      {...props}
    />
  );
}

export function DialogDescription({
  className = '',
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={`text-xs md:text-sm text-sub leading-relaxed ${className}`}
      {...props}
    />
  );
}

export function DialogFooter({
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 sm:gap-3 mt-6 ${className}`}
      {...props}
    />
  );
}
