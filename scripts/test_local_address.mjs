import https from 'node:https';
import http from 'node:http';

async function testWithLocalAddress() {
  console.log('Testing connection with localAddress 10.233.102.8...');
  const start = Date.now();

  const req = https.request({
    hostname: 'api.ipify.org',
    port: 443,
    path: '/?format=json',
    method: 'GET',
    localAddress: '10.233.102.8',
    timeout: 8000
  }, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
      console.log('IP with localAddress:', data, (Date.now() - start) + 'ms');
    });
  });

  req.on('error', e => console.log('ERROR:', e.message));
  req.on('timeout', () => { req.destroy(); console.log('TIMEOUT'); });
  req.end();
}

testWithLocalAddress();
