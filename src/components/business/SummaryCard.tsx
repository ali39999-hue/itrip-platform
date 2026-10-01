'use client';

import type { ReactNode } from 'react';

/**
 * SummaryCard — کارت ۴۲۰px سمت کناری (aside) در صفحات split.
 * در موبایل (زیر ۱۰۲۴px) با چیدمان ستونی خودکار به انتهای صفحه منتقل می‌شود
 * (ترتیب DOM: main اول، aside بعد — media query business.css جهت را می‌چیند).
 */
export function SummaryCard({
  title,
  children,
  raised = true,
}: {
  title?: string;
  children: ReactNode;
  raised?: boolean;
}) {
  return (
    <aside className="fz-split__aside">
      <section className={`fz-card${raised ? ' fz-card--raised' : ''}`}>
        {title && <h2 style={{ fontSize: 18 }}>{title}</h2>}
        {children}
      </section>
    </aside>
  );
}
