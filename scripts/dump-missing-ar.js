const fs = require('fs');
const path = require('path');
const ROOT = require('path').join(__dirname, '..');
const fa = JSON.parse(fs.readFileSync(path.join(ROOT, 'messages', 'fa.json'), 'utf8'));
const ar = JSON.parse(fs.readFileSync(path.join(ROOT, 'messages', 'ar.json'), 'utf8'));
const en = JSON.parse(fs.readFileSync(path.join(ROOT, 'messages', 'en.json'), 'utf8'));

function keys(o, p = '') {
  let r = [];
  for (const k of Object.keys(o)) {
    const v = o[k];
    const kp = p ? p + '.' + k : k;
    if (typeof v === 'object' && v !== null) r = r.concat(keys(v, kp));
    else r.push(kp);
  }
  return r;
}
function getPath(o, p) {
  return p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
}

const missing = keys(fa).filter((k) => getPath(ar, k) === undefined);
for (const k of missing) {
  console.log(k + ' ||| ' + JSON.stringify(getPath(fa, k)) + ' ||| ' + JSON.stringify(getPath(en, k)));
}
console.log('TOTAL: ' + missing.length);
