const fs = require('fs');
const path = require('path');

const OUT = path.resolve('C:\\Users\\Lenovo\\Desktop\\firouzo\\itrip-platform\\screenshots\\visual-review\\wiki-candidates');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

// Filename fragment whitelist — anything outside this list is rejected.
const LANDMARKS = [
  { key: 'isfahan', search: 'Naqsh-e Jahan Square Isfahan' },
  { key: 'isfahan2', search: 'Si-o-se-pol bridge Isfahan night' },
  { key: 'mashhad', search: 'Imam Reza shrine Mashhad' },
  { key: 'tehran', search: 'Azadi Tower Tehran' },
  { key: 'tehran2', search: 'Milad Tower Tehran skyline' },
  { key: 'shiraz', search: 'Nasir al-Mulk Mosque Shiraz' },
  { key: 'shiraz2', search: 'Tomb of Hafez Shiraz' },
  { key: 'tabriz', search: 'Tabriz Shahgoli park' },
  { key: 'tabriz2', search: 'Bazaar of Tabriz' },
  { key: 'yazd', search: 'Yazd badgir windcatcher skyline' },
  { key: 'kashan', search: 'Tabatabaei House Kashan' },
  { key: 'qeshm', search: 'Chahkooh canyon Qeshm' },
];

function safeTarget(key, n) {
  const name = key + '_' + n + '.jpg';
  if (!/^[a-z0-9]+_[12]\.jpg$/.test(name)) throw new Error('bad filename');
  const target = path.resolve(OUT, name);
  if (!target.startsWith(OUT + path.sep)) throw new Error('path escape');
  return target;
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'FiruzoAudit/1.0 (contact: dev@firuzo.online)' } });
  if (!res.ok) throw new Error('HTTP ' + res.status + ' for ' + url);
  return res.json();
}

async function main() {
  for (const l of LANDMARKS) {
    try {
      const api =
        'https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=' +
        encodeURIComponent(l.search) +
        '&gsrnamespace=6&gsrlimit=3&prop=imageinfo&iiprop=url|mime&iiurlwidth=800&format=json';
      const data = await fetchJson(api);
      const pages = Object.values(data.query && data.query.pages ? data.query.pages : {});
      const withInfo = pages
        .map((p) => p.imageinfo && p.imageinfo[0])
        .filter((ii) => ii && ii.mime && ii.mime.startsWith('image/'));
      if (!withInfo.length) {
        console.log(l.key, ': NO RESULT');
        continue;
      }
      let saved = 0;
      for (let i = 0; i < withInfo.length && saved < 2; i++) {
        const ii = withInfo[i];
        if (ii.mime !== 'image/jpeg') continue;
        const imgRes = await fetch(ii.thumburl, { headers: { 'User-Agent': 'FiruzoAudit/1.0' } });
        if (!imgRes.ok) continue;
        const buf = Buffer.from(await imgRes.arrayBuffer());
        fs.writeFileSync(safeTarget(l.key, saved + 1), buf);
        console.log(l.key, 'saved candidate', saved + 1, '(' + Math.round(buf.length / 1024) + 'KB)');
        saved++;
      }
      if (!saved) console.log(l.key, ': no jpeg candidate saved');
    } catch (e) {
      console.log(l.key, 'ERROR:', e.message);
    }
  }
  console.log('DONE');
}

main();
