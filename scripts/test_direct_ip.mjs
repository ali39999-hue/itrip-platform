// SEC-014: credentials must come from the environment — never from source.
if (!process.env.SMSWBS_USERNAME || !process.env.SMSWBS_PASSWORD) {
  console.error('SMSWBS_USERNAME / SMSWBS_PASSWORD are not configured. Refusing to run this diagnostic with embedded credentials.');
  process.exit(1);
}

import https from 'node:https';

async function testDirect() {
  const postData = new URLSearchParams({
    method: 'getData',
    username: process.env.SMSWBS_USERNAME,
    password: process.env.SMSWBS_PASSWORD
  }).toString();

  const req = https.request({
    host: '185.4.30.32',
    port: 443,
    path: '/webservice/test',
    method: 'POST',
    servername: 'sms.hupa.ir',
    localAddress: '10.233.102.8',
    headers: {
      'Host': 'sms.hupa.ir',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Content-Length': Buffer.byteLength(postData),
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      'Cookie': 'alarm=active; theme=k-theme; PHPSESSID=m9k120v43n7q012e84v3v0o634',
      'Origin': 'https://sms.hupa.ir',
      'Referer': 'https://sms.hupa.ir/webservice/test',
      'X-Requested-With': 'XMLHttpRequest',
      'Accept': '*/*'
    }
  }, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => console.log('STATUS:', res.statusCode, 'DATA:', data));
  });

  req.on('error', e => console.log('ERR:', e.message));
  req.write(postData);
  req.end();
}

testDirect();
