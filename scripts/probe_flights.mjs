import http from 'node:http';

async function probe() {
  try {
    const res = await fetch('http://localhost:3000/fa/flights');
    console.log('Status:', res.status);
    const text = await res.text();
    console.log('Body length:', text.length);
    console.log('Body snippet:', text.slice(0, 1500));
  } catch (e) {
    console.error('Probe error:', e.message);
  }
}

const server = http.createServer((req, res) => res.end('ok'));
server.listen(3099, '127.0.0.1', () => {
  probe();
});
