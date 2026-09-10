const urls = [
  'http://localhost:3000/',
  'http://localhost:3000/fa',
  'http://localhost:3000/fa/flights',
  'http://localhost:3000/fa/flights/search?from=%D8%AA%D9%87%D8%B1%D8%A7%D9%86&to=%D9%85%D8%B4%D9%87%D8%AF',
  'http://localhost:3000/fa/hotels',
  'http://localhost:3000/fa/hotels/search?destination=%D9%85%D8%B4%D9%87%D8%AF',
  'http://localhost:3000/api/health/ready'
];

async function check() {
  for (const url of urls) {
    try {
      const res = await fetch(url);
      console.log(`[${res.status}] ${url} -> redirected to: ${res.url}`);
      if (!res.ok) {
        const text = await res.text();
        console.log(`Error body (first 300 chars):`, text.slice(0, 300));
      }
    } catch (err) {
      console.error(`FAILED ${url}:`, err.message);
    }
  }
}

check();
