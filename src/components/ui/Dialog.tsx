'use client';

import * as React from 'react';
import { X } from 'lucide-react';

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
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) {
        onOpenChange(false);
      }
    }
    if (open) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onOpenChange]);

  return (
    <DialogContext.Provider value={{ open, onOpenChange }}>
      {children}
    </DialogContext.Provider>
  );
}

export function DialogContent({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { open, onOpenChange } = React.useContext(DialogContext);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={() => onOpenChange(false)}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`relative w-full max-w-lg rounded-3xl bg-surface border border-line p-6 shadow-elev-3 animate-in zoom-in-95 duration-200 ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute top-4 end-4 w-8 h-8 rounded-full bg-soft text-sub hover:text-ink hover:bg-line/40 grid place-items-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          aria-label="Close"
        >
          <X size={16} />
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
      className={`flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 sm:space-x-reverse gap-2 mt-6 ${className}`}
      {...props}
    />
  );
}
