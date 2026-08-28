'use client';

import * as React from 'react';

interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

const TabsContext = React.createContext<{
  value: string;
  onValueChange: (value: string) => void;
}>({ value: '', onValueChange: () => {} });

export function Tabs({ value, onValueChange, children, className = '' }: TabsProps) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={`w-full ${className}`}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={`inline-flex items-center justify-center rounded-2xl bg-soft/80 p-1.5 border border-line/60 text-sub ${className}`}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  children,
  className = '',
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { value: activeValue, onValueChange } = React.useContext(TabsContext);
  const active = activeValue === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={() => onValueChange(value)}
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-xl px-4 py-2 text-xs font-bold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:pointer-events-none disabled:opacity-50 ${
        active
          ? 'bg-surface text-brand-dark shadow-sm scale-[1.02]'
          : 'text-sub hover:text-ink hover:bg-surface/50'
      } ${className}`}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  children,
  className = '',
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { value: activeValue } = React.useContext(TabsContext);
  if (activeValue !== value) return null;

  return (
    <div
      role="tabpanel"
      className={`mt-4 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand animate-in fade-in-50 duration-200 ${className}`}
    >
      {children}
    </div>
  );
}
