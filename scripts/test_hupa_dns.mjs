import https from 'node:https';
import http from 'node:http';
import dns from 'node:dns/promises';

async function testHupa() {
  console.log('Resolving sms.hupa.ir...');
  const addresses = await dns.resolve4('sms.hupa.ir').catch(e => e.message);
  console.log('Addresses:', addresses);

  const start = Date.now();
  const req = https.request({
    hostname: 'sms.hupa.ir',
    port: 443,
    path: '/',
    method: 'GET',
    timeout: 15000,
    headers: { 'User-Agent': 'Mozilla/5.0' }
  }, (res) => {
    console.log('Response status:', res.statusCode, 'in', Date.now() - start, 'ms');
  });

  req.on('error', (e) => console.log('Req error:', e.message, 'in', Date.now() - start, 'ms'));
  req.on('timeout', () => {
    console.log('Req timeout in', Date.now() - start, 'ms');
    req.destroy();
  });
  req.end();
}

testHupa();
