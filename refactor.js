const fs = require('fs');
const path = require('path');

const files = [
  'src/app/[locale]/destinations/page.tsx',
  'src/app/[locale]/guide/page.tsx',
  'src/app/[locale]/tours/page.tsx',
  'src/app/[locale]/travelogues/page.tsx',
  'src/app/[locale]/travelogues/[id]/page.tsx',
  'src/app/[locale]/my-trips/page.tsx',
  'src/app/[locale]/wallet/page.tsx',
  'src/app/[locale]/account/page.tsx',
  'src/app/[locale]/support/page.tsx'
];

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Replace ml/mr/pl/pr with ms/me/ps/pe
  content = content.replace(/\bml-(\d+|auto|px|\[.*?\])\b/g, 'ms-$1');
  content = content.replace(/\bmr-(\d+|auto|px|\[.*?\])\b/g, 'me-$1');
  content = content.replace(/\bpl-(\d+|auto|px|\[.*?\])\b/g, 'ps-$1');
  content = content.replace(/\bpr-(\d+|auto|px|\[.*?\])\b/g, 'pe-$1');
  content = content.replace(/\b-ml-(\d+|px|\[.*?\])\b/g, '-ms-$1');
  content = content.replace(/\b-mr-(\d+|px|\[.*?\])\b/g, '-me-$1');

  // 2. Replace shadows to shadow-sm for high-end taste
  content = content.replace(/\bshadow-md\b/g, 'shadow-sm');
  content = content.replace(/\bshadow-lg\b/g, 'shadow-sm');
  content = content.replace(/\bshadow-elev-1\b/g, 'shadow-sm');
  content = content.replace(/\bshadow-elev-2\b/g, 'shadow-sm');

  // 3. Add focus-visible:ring-brand to interactive elements (button, Link, a, input, summary)
  // We'll do a regex to find className="..." inside these tags and append focus ring.
  const tagRegex = /<(button|Link|a|input|summary)\b([^>]*?)className=(['"])(.*?)\3([^>]*?)>/g;
  content = content.replace(tagRegex, (match, tag, before, quote, cls, after) => {
    if (!cls.includes('focus-visible:ring-brand')) {
      cls = cls.trim() + ' focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand';
    }
    return `<${tag}${before}className=${quote}${cls}${quote}${after}>`;
  });
  
  // also for className={`...`}
  const tagRegexTpl = /<(button|Link|a|input|summary)\b([^>]*?)className=\{`(.*?)`\}([^>]*?)>/gs;
  content = content.replace(tagRegexTpl, (match, tag, before, cls, after) => {
    if (!cls.includes('focus-visible:ring-brand')) {
      cls = cls.trim() + ' focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand';
    }
    return `<${tag}${before}className={\`${cls}\`}${after}>`;
  });

  // 4. Check ARIA labels on specific icon-only buttons
  // Guide page
  if (file.includes('guide/page.tsx')) {
    content = content.replace(/<button \n\s*onClick=\{\(\) => setOpenId\(null\)\}\n\s*className="absolute/g, '<button aria-label="بستن"\n                  onClick={() => setOpenId(null)}\n                  className="absolute');
    content = content.replace(/<button \n\s*onClick=\{\(\) => setOpenId\(null\)\}\n\s*className="w-8 h-8/g, '<button aria-label="بستن"\n                  onClick={() => setOpenId(null)}\n                  className="w-8 h-8');
  }
  
  // Wallet page
  if (file.includes('wallet/page.tsx')) {
    content = content.replace(/<button \n\s*onClick=\{\(\) => \{ const temp/g, '<button aria-label="جابجایی ارز" \n                  onClick={() => { const temp');
  }

  // Support page
  if (file.includes('support/page.tsx')) {
    content = content.replace(/<button className="fixed bottom-8/g, '<button aria-label="پشتیبانی" className="fixed bottom-8');
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Processed ${file}`);
});
