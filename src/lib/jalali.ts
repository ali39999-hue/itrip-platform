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
