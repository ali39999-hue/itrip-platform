import https from 'node:https';

async function testPath(path, body) {
  const pStr = typeof body === 'string' ? body : JSON.stringify(body);
  const isForm = typeof body === 'string' && body.includes('=');
  const start = Date.now();
  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'sms.hupa.ir',
      port: 443,
      path,
      method: 'POST',
      timeout: 10000,
      headers: {
        'Content-Type': isForm ? 'application/x-www-form-urlencoded' : 'application/json',
        'Content-Length': Buffer.byteLength(pStr),
        'User-Agent': 'Mozilla/5.0'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ path, status: res.statusCode, data: data.slice(0, 120), time: Date.now() - start }));
    });
    req.on('error', e => resolve({ path, error: e.message, time: Date.now() - start }));
    req.on('timeout', () => { req.destroy(); resolve({ path, error: 'timeout', time: Date.now() - start }); });
    req.write(pStr);
    req.end();
  });
}

async function run() {
  const r1 = await testPath('/class/sms/restful/getData.php', { uname: '09123764868', pass: 'Hvd1367++@' });
  const r2 = await testPath('/class/sms/restful/getData.php', { username: '09123764868', api_password: 'Hvd1367++@' });
  const r3 = await testPath('/class/sms/restful/OTP/send_OTP.php', { username: '09123764868', api_password: 'Hvd1367++@', mobile: '09105247414', footer: 'فیروزو' });
  const r4 = await testPath('/class/sms/restful/sendSms_OneToMany.php', { username: '09123764868', api_password: 'Hvd1367++@', fromNum: '50004001764868', toNum: ['09105247414'], messageContent: 'فیروزو' });
  const r5 = await testPath('/class/sms/restful/sendSms_Pattern.php', { fromNum: '3000505', toNum: '09105247414', user: '09123764868', pass: 'Hvd1367++@', pattern_code: '1412', input_data: [{ code: '123456' }] });
  console.log(JSON.stringify([r1, r2, r3, r4, r5], null, 2));
}

run();
