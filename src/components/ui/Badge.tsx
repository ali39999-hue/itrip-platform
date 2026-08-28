import * as React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'brand' | 'action' | 'gold' | 'mint' | 'destructive' | 'success' | 'outline';
}

function Badge({ className = '', variant = 'default', ...props }: BadgeProps) {
  const variantStyles = {
    default: 'bg-soft text-sub border-line/60',
    brand: 'bg-brand/10 text-brand-dark border-brand/20',
    action: 'bg-action text-[#14201f] border-transparent font-black',
    gold: 'bg-gold-soft text-price border-gold/30',
    mint: 'bg-mint text-brand-dark border-brand/20',
    destructive: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
    success: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
    outline: 'border-line text-ink bg-transparent',
  };

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-brand ${variantStyles[variant]} ${className}`}
      {...props}
    />
  );
}

export { Badge };
