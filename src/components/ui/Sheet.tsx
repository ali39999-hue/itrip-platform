'use client';

import * as React from 'react';
import { X } from 'lucide-react';

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  side?: 'bottom' | 'end' | 'start' | 'top';
}

const SheetContext = React.createContext<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side: 'bottom' | 'end' | 'start' | 'top';
}>({ open: false, onOpenChange: () => {}, side: 'bottom' });

export function Sheet({
  open,
  onOpenChange,
  children,
  side = 'bottom',
}: SheetProps) {
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
    <SheetContext.Provider value={{ open, onOpenChange, side }}>
      {children}
    </SheetContext.Provider>
  );
}

export function SheetContent({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { open, onOpenChange, side } = React.useContext(SheetContext);

  if (!open) return null;

  const sideClasses = {
    bottom:
      'inset-x-0 bottom-0 max-h-[85vh] rounded-t-3xl border-t animate-in slide-in-from-bottom duration-300',
    top: 'inset-x-0 top-0 max-h-[85vh] rounded-b-3xl border-b animate-in slide-in-from-top duration-300',
    end: 'inset-y-0 end-0 h-full w-full max-w-md border-s animate-in slide-in-from-right rtl:slide-in-from-left duration-300',
    start:
      'inset-y-0 start-0 h-full w-full max-w-md border-e animate-in slide-in-from-left rtl:slide-in-from-right duration-300',
  };

  return (
    <div
      className="fixed inset-0 z-[150] bg-ink/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={() => onOpenChange(false)}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`fixed z-[151] bg-surface border-line p-6 shadow-elev-3 overflow-y-auto ${sideClasses[side]} ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {side === 'bottom' && (
          <div className="w-12 h-1.5 rounded-full bg-line/80 mx-auto mb-4 cursor-grab" />
        )}
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

export function SheetHeader({
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`flex flex-col space-y-1 text-start pe-8 mb-4 ${className}`}
      {...props}
    />
  );
}

export function SheetTitle({
  className = '',
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={`text-lg font-black text-ink leading-none tracking-tight ${className}`}
      {...props}
    />
  );
}

export function SheetDescription({
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
