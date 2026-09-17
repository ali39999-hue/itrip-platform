'use client';

import { useEffect, useState } from 'react';

export type ScrollDirection = 'up' | 'down';

/**
 * جهت اسکرول عمودی (`up` / `down`) با ضخامتِ حرکتیِ مشخص.
 *
 * چرا لازم است: نوارهای شناور موبایل (پیل فیلتر/مرتب‌سازی، نوار خلاصه) وقتی
 * کاربر در حال خواندن لیست به پایین می‌رود روی محتوای کارت‌ها می‌افتند. با
 * مخفی‌شدن در جهت «پایین» و بازگشت در جهت «بالا»، خواندنِ لیست بدون پوشیدگی
 * انجام می‌شود (الگوی Alibaba/FlyToday) و کاربر با یک اسکرول کوچک به بالا
 * کنترل‌ها را برمی‌گرداند.
 */
export function useScrollDirection(threshold = 12, topOffset = 120): ScrollDirection {
  const [direction, setDirection] = useState<ScrollDirection>('up');

  useEffect(() => {
    let last = window.scrollY;
    let raf = 0;

    function onScroll() {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        const y = window.scrollY;
        const delta = y - last;
        if (Math.abs(delta) >= threshold) {
          setDirection(delta > 0 && y > topOffset ? 'down' : 'up');
          last = y;
        }
      });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [threshold, topOffset]);

  return direction;
}
