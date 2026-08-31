const fs = require('fs');
const p = 'src/app/[locale';
try {
  const st = fs.lstatSync(p);
  console.log('exists, isDir:', st.isDirectory());
  function cnt(d) {
    let n = 0;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.isDirectory()) n += cnt(d + '/' + e.name);
      else n++;
    }
    return n;
  }
  console.log('file count:', cnt(p));
  if (cnt(p) === 0) {
    fs.rmdirSync(p, { recursive: true });
    console.log('REMOVED empty skeleton dir');
  } else {
    console.log('NOT EMPTY - left in place');
  }
} catch (e) {
  console.log('ERR', e.message);
}
