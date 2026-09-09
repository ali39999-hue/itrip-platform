const fs = require('fs');
const path = require('path');

const OUT = path.resolve('C:\\Users\\Lenovo\\Desktop\\firouzo\\itrip-platform\\screenshots\\visual-review\\wiki-candidates');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'FiruzoAudit/1.0 (contact: dev@firuzo.online)' } });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

async function main() {
  for (const search of ['Amir Chakhmaq Yazd', 'Jameh Mosque of Yazd']) {
    const api =
      'https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=' +
      encodeURIComponent(search) +
      '&gsrnamespace=6&gsrlimit=3&prop=imageinfo&iiprop=url|mime&iiurlwidth=800&format=json';
    const data = await fetchJson(api);
    const pages = Object.values(data.query && data.query.pages ? data.query.pages : {});
    const infos = pages.map((p) => p.imageinfo && p.imageinfo[0]).filter((ii) => ii && ii.mime === 'image/jpeg');
    console.log('### ' + search);
    let n = 0;
    for (const ii of infos) {
      console.log(ii.thumburl);
      const r = await fetch(ii.thumburl, { headers: { 'User-Agent': 'FiruzoAudit/1.0' } });
      if (!r.ok) continue;
      const buf = Buffer.from(await r.arrayBuffer());
      const name = 'yazd_alt_' + (n + 1) + '.jpg';
      const target = path.resolve(OUT, name);
      if (!target.startsWith(OUT + path.sep)) throw new Error('bad path');
      fs.writeFileSync(target, buf);
      n++;
      if (n >= 2) break;
    }
  }
  console.log('DONE');
}

main().catch((e) => { console.error(e.message); process.exit(1); });
