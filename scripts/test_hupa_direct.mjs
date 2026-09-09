import https from 'node:https';

async function testWebservice() {
  const params = new URLSearchParams({
    method: 'sendSms_Pattern',
    username: '09123764868',
    password: 'Hvd1367++@',
    fromNum: '3000505',
    toNum: '09105247414',
    pattern_code: '1412',
    input_data: JSON.stringify({ code: '654321' })
  });

  const postData = params.toString();
  const start = Date.now();

  const req = https.request({
    hostname: 'sms.hupa.ir',
    port: 443,
    path: '/webservice/test',
    method: 'POST',
    timeout: 10000,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData),
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Origin': 'https://sms.hupa.ir',
      'Referer': 'https://sms.hupa.ir/webservice/test'
    }
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('STATUS:', res.statusCode);
      console.log('HEADERS:', res.headers);
      console.log('RESPONSE:', data);
      console.log('DURATION:', Date.now() - start, 'ms');
    });
  });

  req.on('error', e => console.log('ERROR:', e.message));
  req.on('timeout', () => { req.destroy(); console.log('TIMEOUT'); });
  req.write(postData);
  req.end();
}

testWebservice();
