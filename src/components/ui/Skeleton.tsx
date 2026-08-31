import * as React from 'react';

function Skeleton({
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-line/60 dark:bg-line/20 ${className}`}
      {...props}
    />
  );
}

export { Skeleton };
