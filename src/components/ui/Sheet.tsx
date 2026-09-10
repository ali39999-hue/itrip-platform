'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useFocusTrap } from '@/hooks/useFocusTrap';

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
    // Lock scroll while open. Keyboard handling (Escape + Tab wrap) lives in
    // SheetContent via useFocusTrap so focus is always managed together.
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
    <SheetContext.Provider value={{ open, onOpenChange, side }}>
      {children}
    </SheetContext.Provider>
  );
}

export function SheetContent({
  children,
  className = '',
  closeAriaLabel = 'Close',
}: {
  children: React.ReactNode;
  className?: string;
  closeAriaLabel?: string;
}) {
  const { open, onOpenChange, side } = React.useContext(SheetContext);
  const panelRef = useFocusTrap<HTMLDivElement>(open, {
    onEscape: () => onOpenChange(false),
  });

  const sideClasses = {
    bottom:
      'inset-x-0 bottom-0 max-h-[85vh] rounded-t-3xl border-t animate-in slide-in-from-bottom duration-300',
    top: 'inset-x-0 top-0 max-h-[85vh] rounded-b-3xl border-b animate-in slide-in-from-top duration-300',
    end: 'inset-y-0 end-0 h-full w-full max-w-md border-s animate-in slide-in-from-right rtl:slide-in-from-left duration-300',
    start:
      'inset-y-0 start-0 h-full w-full max-w-md border-e animate-in slide-in-from-left rtl:slide-in-from-right duration-300',
  };

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[150] bg-ink/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => onOpenChange(false)}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            drag={side === 'bottom' ? 'y' : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (side === 'bottom' && (info.offset.y > 80 || info.velocity.y > 350)) {
                onOpenChange(false);
              }
            }}
            initial={side === 'bottom' ? { y: '100%' } : undefined}
            animate={side === 'bottom' ? { y: 0 } : undefined}
            exit={side === 'bottom' ? { y: '100%' } : undefined}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className={`fixed z-[151] bg-surface border-line p-6 shadow-elev-3 overflow-y-auto ${sideClasses[side]} ${className}`}
            onClick={(e) => e.stopPropagation()}
          >
            {side === 'bottom' && (
              <div className="w-12 h-1.5 rounded-full bg-line/80 mx-auto mb-4 cursor-grab active:cursor-grabbing touch-none select-none" />
            )}
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
          </motion.div>
        </div>
      )}
    </AnimatePresence>
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
