// WCAG contrast verification of Firuzo design tokens (light + dark, post dark-mode completion).
function lum(hex) {
  const c = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map(i => parseInt(c.slice(i, i + 2), 16) / 255)
    .map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function ratio(fg, bg) {
  const [l1, l2] = [lum(fg), lum(bg)].sort((a, b) => b - a);
  return (l1 + 0.05) / (l2 + 0.05);
}
const light = {
  bg: '#fafcfc', surface: '#ffffff', ink: '#14201f', sub: '#4b5958',
  brand: '#00a9a5', brandDark: '#046e6b', surfaceFg: '#ffffff',
  mint: '#e4f6f5', line: '#dce5e4', action: '#f0a62a', actionInk: '#14201f',
  price: '#9c6209', goldSoft: '#fef6e7',
  // interactive bg-brand resolves to brand-dark via the AA rule in globals.css
  brandBtn: '#046e6b',
};
const dark = {
  bg: '#031f20', surface: '#053f3e', ink: '#eaf4f3', sub: '#9fb5b4',
  brand: '#00a9a5', brandDark: '#7fd6d2', surfaceFg: '#04292a',
  mint: '#05302f', line: '#0c4e4c', action: '#f0a62a', actionInk: '#14201f',
  price: '#f5b945', goldSoft: '#272010',
  // in dark, interactive bg-brand resolves to brand-dark (= mint-bright) with dark label
  brandBtn: '#7fd6d2',
};
const pairs = [
  ['body text on paper', 'ink', 'bg', 4.5],
  ['body text on surface', 'ink', 'surface', 4.5],
  ['secondary text on surface', 'sub', 'surface', 4.5],
  ['brand text (brand-dark) on surface', 'brandDark', 'surface', 4.5],
  ['brand text on mint tint', 'brandDark', 'mint', 4.5],
  ['price text on surface', 'price', 'surface', 4.5],
  ['btn label on brand (dark label)', 'surfaceFg', 'brandBtn', 4.5],
  ['btn label on action', 'actionInk', 'action', 4.5],
  ['border vs surface (UI 3:1)', 'line', 'surface', 3.0],
];
let fails = 0;
for (const [mode, t] of [['LIGHT', light], ['DARK', dark]]) {
  console.log(`\n=== ${mode} ===`);
  for (const [name, f, b, min] of pairs) {
    const r = ratio(t[f], t[b]);
    const ok = r >= min;
    if (!ok) fails++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(38)} ${r.toFixed(2)}:1  (min ${min})`);
  }
}
console.log(`\n${fails} failing pairs`);
