// One-off: dump className context for the small-icon-target findings.
import { readFileSync } from 'node:fs';

const targets = [
  ['src/app/[locale]/esim/page.tsx', 215],
  ['src/app/[locale]/flights/search/page.tsx', 1195],
  ['src/app/[locale]/flights/search/page.tsx', 1305],
  ['src/app/[locale]/flights/search/page.tsx', 1360],
  ['src/app/[locale]/guide/page.tsx', 369],
  ['src/app/[locale]/guide/page.tsx', 380],
  ['src/app/[locale]/hotels/search/page.tsx', 367],
  ['src/app/[locale]/insurance/page.tsx', 204],
  ['src/app/[locale]/payment-status/page.tsx', 169],
  ['src/app/[locale]/tours/page.tsx', 324],
  ['src/app/[locale]/trains/page.tsx', 161],
  ['src/app/[locale]/trains/page.tsx', 317],
  ['src/app/[locale]/transfers/page.tsx', 185],
  ['src/app/[locale]/transfers/page.tsx', 321],
  ['src/app/[locale]/travelogues/[id]/page.tsx', 213],
  ['src/app/[locale]/visa/page.tsx', 105],
  ['src/app/[locale]/visa/page.tsx', 219],
];

for (const [file, line] of targets) {
  const lines = readFileSync(file, 'utf8').split('\n');
  const slice = lines.slice(line - 1, line + 9).join('\n').replace(/\s+/g, ' ');
  const cls = slice.match(/className="([^"]*)"/)?.[1] || slice.match(/className=\{`([^`]*)`?\}/)?.[1] || '(none found)';
  console.log(`--- ${file}:${line}\n    ${cls.slice(0, 260)}`);
}
