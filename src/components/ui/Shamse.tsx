export function Shamse({ size = 22, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden
      className={className}
    >
      <path
        fill="currentColor"
        d="M12 0l2.6 6.2L21 3l-3.2 6.4L24 12l-6.2 2.6L21 21l-6.4-3.2L12 24l-2.6-6.2L3 21l3.2-6.4L0 12l6.2-2.6L3 3l6.4 3.2z"
      />
    </svg>
  );
}

/* جداکننده‌ی کاشی ایرانی — امضای برند فیروزو */
export function ShamseDivider({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-4 text-line ${className}`} aria-hidden>
      <span className="flex-1 h-px bg-current" />
      <Shamse className="text-brand shrink-0" />
      <span className="flex-1 h-px bg-current" />
    </div>
  );
}
