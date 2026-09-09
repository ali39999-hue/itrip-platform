import https from 'node:https';

async function sendPatternOtp(mobile, code) {
  const params = new URLSearchParams({
    method: 'sendSms_Pattern',
    username: '09123764868',
    password: '@Hvd1367++',
    fromNum: '3000505',
    toNum: mobile,
    pattern_code: '1412',
    input_data: JSON.stringify({ code })
  });

  const postData = params.toString();
  const start = Date.now();

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'sms.hupa.ir',
      port: 443,
      path: '/webservice/test',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Cookie': 'alarm=active; theme=k-theme; PHPSESSID=m9k120v43n7q012e84v3v0o634',
        'Origin': 'https://sms.hupa.ir',
        'Referer': 'https://sms.hupa.ir/webservice/test',
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': '*/*'
      },
      timeout: 10000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data, time: Date.now() - start }));
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.write(postData);
    req.end();
  });
}

async function run() {
  try {
    const res = await sendPatternOtp('09105247414', '777888');
    console.log('SUCCESS:', res);
  } catch (e) {
    console.log('ERROR:', e.message);
  }
}

run();
