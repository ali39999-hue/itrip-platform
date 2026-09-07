const fs = require('fs');
const content = fs.readFileSync('C:/Users/Lenovo/.zcode/cli/exec/sess_581788a3-cedf-4b54-8766-0ae1ff14829b/call_1498242-stdout.log', 'utf8');

// Search for headings or major sections in FlyToday's HTML
const h1s = content.match(/<h1[^>]*>[\s\S]*?<\/h1>/gi) || [];
const h2s = content.match(/<h2[^>]*>[\s\S]*?<\/h2>/gi) || [];
console.log('FlyToday H1s:', h1s.map(h => h.replace(/<[^>]+>/g, '').trim()));
console.log('FlyToday H2s:', h2s.map(h => h.replace(/<[^>]+>/g, '').trim()).slice(0, 10));
