const fs = require('fs');
const code = fs.readFileSync('src/domains/autobuy/AutoBuyDomainService.ts', 'utf8');
const suppliers = code.match(/ALLOWED_SUPPLIERS:\s*\[([\s\S]*?)\]/)[1]
  .split('\n')
  .map(l => l.replace(/[',]/g, '').trim())
  .filter(Boolean);
console.log('Suppliers count:', suppliers.length);
console.log('Includes آسمان?', suppliers.includes('آسمان'));
console.log('Some check:', suppliers.some(s => 'آسمان'.includes(s) || s.includes('آسمان')));
