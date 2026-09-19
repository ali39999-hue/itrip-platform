const G_FMT = new Intl.DateTimeFormat('fa-IR-u-ca-gregory', { day: 'numeric', month: 'long' });
const J_FMT = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { day: 'numeric', month: 'long' });
const W_FMT = new Intl.DateTimeFormat('fa-IR-u-ca-gregory', { weekday: 'long' });

export function dualDate(iso: string): { g: string; j: string; weekday: string } {
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return { g: '', j: '', weekday: '' };
  return {
    g: G_FMT.format(d),
    j: J_FMT.format(d),
    weekday: W_FMT.format(d),
  };
}

/** Full Jalali date for a Date object: «۵ مهر». Wraps dualDate via the local ISO date. */
export function formatJalali(d: Date): string {
  if (isNaN(d.getTime())) return '';
  return dualDate(toLocalIsoDate(d)).j;
}

/** YYYY-MM-DD in local time (mirrors src/lib/utils.ts toLocalIso to avoid a cycle). */
function toLocalIsoDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
