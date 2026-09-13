import { readFileSync } from 'fs';
import { resolve } from 'path';

const file = resolve('../api_hunt/portal_bundles/interactive_search_result.html');
const html = readFileSync(file, 'utf8');

console.log('HTML Length:', html.length);
console.log('Title:', (html.match(/<title>([^<]*)<\/title>/i)||[])[1]);

// Search for flight numbers, airlines, and prices
const prices = [...html.matchAll(/(\d{1,3}(?:,\d{3}){2,})/g)].map(m => m[1]);
console.log('Prices count:', prices.length, 'Samples:', prices.slice(0, 10));

const airlines = html.match(/ماهان|آتا|وارش|کاسپین|ایران ایر|زاگرس|معراج|قشم|کیش|ساها|سپهران|چابهار|پویا/gi) || [];
console.log('Airlines found:', [...new Set(airlines)]);

const flightNums = html.match(/\b([A-Z0-9]{2}[-\s]?\d{3,4})\b/g) || [];
console.log('Flight numbers sample:', [...new Set(flightNums)].slice(0, 15));

// Check if there are script variables with data
const dataMatch = html.match(/var\s+(?:resultData|searchData|flightData|model)\s*=\s*[\s\S]*?;/i);
console.log('Data script match:', dataMatch ? dataMatch[0].slice(0, 200) : 'none');
