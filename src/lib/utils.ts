import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function daysFromNow(days: number) {
  // تاریخ محلی (نه UTC) — در UTC+3:30 به‌روزرسانی UTC یک روز جابجا می‌شد
  const d = new Date(Date.now() + days * 86400000)
  return toLocalIso(d)
}

/** YYYY-MM-DD بر اساس اجزای محلی تاریخ؛ toISOString در ایران یک روز خطا داشت */
export function toLocalIso(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
