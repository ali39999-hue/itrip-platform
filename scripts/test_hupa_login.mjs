import https from 'node:https';

async function testLogin() {
  const params = new URLSearchParams({
    username: '09123764868',
    password: 'Hvd1367++@'
  });
  const body = params.toString();

  const req = https.request({
    hostname: 'sms.hupa.ir',
    port: 443,
    path: '/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(body),
      'User-Agent': 'Mozilla/5.0'
    }
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('LOGIN STATUS:', res.statusCode);
      console.log('SET-COOKIE:', res.headers['set-cookie']);
      console.log('LOCATION:', res.headers['location']);
      console.log('DATA:', data.slice(0, 200));
    });
  });

  req.on('error', e => console.log('ERROR:', e.message));
  req.write(body);
  req.end();
}

testLogin();
