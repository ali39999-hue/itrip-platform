export const gShort = new Intl.DateTimeFormat('fa-IR-u-ca-gregory', { day: 'numeric', month: 'long' });
export const gFmt = new Intl.DateTimeFormat('fa-IR-u-ca-gregory', { day: 'numeric', month: 'long', year: 'numeric' });
export const wFmt = new Intl.DateTimeFormat('fa-IR-u-ca-gregory', { weekday: 'long' });
export const jFmt = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { day: 'numeric', month: 'long' });

export const fa = (n: number | string) => Number(n).toLocaleString('fa-IR');
export const fa1 = (n: number | string) => Number(n).toLocaleString('fa-IR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
