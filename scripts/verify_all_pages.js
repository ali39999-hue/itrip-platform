const urls = [
  'http://localhost:3000/fa',
  'http://localhost:3000/fa/flights/search',
  'http://localhost:3000/fa/hotels/search',
  'http://localhost:3000/fa/tours',
  'http://localhost:3000/fa/trains',
  'http://localhost:3000/fa/transfers',
  'http://localhost:3000/fa/visa',
  'http://localhost:3000/fa/insurance',
  'http://localhost:3000/fa/esim',
  'http://localhost:3000/fa/support'
];

(async () => {
  console.log('Testing live routes on http://localhost:3000:');
  for (const url of urls) {
    try {
      const res = await fetch(url);
      console.log(`  ${url.padEnd(42)} -> Status ${res.status}`);
    } catch (err) {
      console.error(`  ${url.padEnd(42)} -> FAILED:`, err.message);
    }
  }
})();
