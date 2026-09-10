import pkg from 'react-date-object';
import persian from 'react-date-object/calendars/persian.js';
import persian_fa from 'react-date-object/locales/persian_fa.js';
import gregorian from 'react-date-object/calendars/gregorian.js';
import gregorian_en from 'react-date-object/locales/gregorian_en.js';

const DateObject = pkg.default || pkg;
const d1 = new DateObject({ date: new Date('2026-09-22'), calendar: persian, locale: persian_fa });
console.log('Fa formatted:', d1.format('D MMMM (dddd)'));

const d_en = new DateObject({ date: new Date('2026-09-22'), calendar: gregorian, locale: gregorian_en });
console.log('En formatted:', d_en.format('D MMM (ddd)'));
