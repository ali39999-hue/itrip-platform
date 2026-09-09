const LANDMARKS = [
  { key: 'isfahan', search: 'Naqsh-e Jahan Square Isfahan' },
  { key: 'mashhad', search: 'Imam Reza shrine Mashhad' },
  { key: 'tehran', search: 'Azadi Tower Tehran' },
  { key: 'shiraz', search: 'Nasir al-Mulk Mosque Shiraz' },
  { key: 'tabriz', search: 'Tabriz Shahgoli park' },
  { key: 'kashan', search: 'Tabatabaei House Kashan' },
  { key: 'qeshm', search: 'Chahkooh canyon Qeshm' },
];

async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'FiruzoAudit/1.0 (contact: dev@firuzo.online)' } });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

async function main() {
  for (const l of LANDMARKS) {
    const api =
      'https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=' +
      encodeURIComponent(l.search) +
      '&gsrnamespace=6&gsrlimit=3&prop=imageinfo&iiprop=url|mime&iiurlwidth=800&format=json';
    const data = await fetchJson(api);
    const pages = Object.values(data.query && data.query.pages ? data.query.pages : {});
    const infos = pages.map((p) => p.imageinfo && p.imageinfo[0]).filter((ii) => ii && ii.mime === 'image/jpeg');
    console.log('### ' + l.key);
    for (const ii of infos.slice(0, 2)) {
      console.log(ii.thumburl);
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
