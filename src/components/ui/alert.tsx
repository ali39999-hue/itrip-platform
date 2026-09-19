import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const alertVariants = cva(
  'relative w-full rounded-2xl border p-3.5 text-sm flex items-start gap-3 text-ink transition-colors [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:mt-0.5',
  {
    variants: {
      variant: {
        default: 'bg-surface text-ink border-line shadow-elev-1',
        destructive:
          'border-destructive/30 text-destructive bg-destructive/10 dark:border-destructive/40 [&>svg]:text-destructive',
        warning:
          'border-amber-500/30 text-amber-900 dark:text-amber-200 bg-amber-500/10 dark:bg-amber-950/40 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400',
        info:
          'border-sky-500/30 text-sky-900 dark:text-sky-200 bg-sky-500/10 dark:bg-sky-950/40 [&>svg]:text-sky-600 dark:[&>svg]:text-sky-400',
        success:
          'border-emerald-500/30 text-emerald-900 dark:text-emerald-200 bg-emerald-500/10 dark:bg-emerald-950/40 [&>svg]:text-emerald-600 dark:[&>svg]:text-emerald-400',
        brand:
          'border-brand/30 text-brand-dark dark:text-mint-bright bg-mint/50 dark:bg-brand/10 [&>svg]:text-brand-dark dark:[&>svg]:text-mint-bright',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    data-slot="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
));
Alert.displayName = 'Alert';

const AlertTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    data-slot="alert-title"
    className={cn('font-black text-xs sm:text-sm tracking-tight leading-snug', className)}
    {...props}
  />
));
AlertTitle.displayName = 'AlertTitle';

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="alert-description"
    className={cn('text-xs text-sub leading-relaxed font-medium mt-0.5 [&_p]:leading-relaxed', className)}
    {...props}
  />
));
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertTitle, AlertDescription };
