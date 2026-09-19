// SEC-014: credentials must come from the environment — never from source.
if (!process.env.SMSWBS_USERNAME || !process.env.SMSWBS_PASSWORD) {
  console.error('SMSWBS_USERNAME / SMSWBS_PASSWORD are not configured. Refusing to run this diagnostic with embedded credentials.');
  process.exit(1);
}

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
  const r1 = await testPath('/class/sms/restful/getData.php', { uname: process.env.SMSWBS_USERNAME, pass: process.env.SMSWBS_PASSWORD });
  const r2 = await testPath('/class/sms/restful/getData.php', { username: process.env.SMSWBS_USERNAME, api_password: process.env.SMSWBS_PASSWORD });
  const r3 = await testPath('/class/sms/restful/OTP/send_OTP.php', { username: process.env.SMSWBS_USERNAME, api_password: process.env.SMSWBS_PASSWORD, mobile: '09105247414', footer: 'فیروزو' });
  const r4 = await testPath('/class/sms/restful/sendSms_OneToMany.php', { username: process.env.SMSWBS_USERNAME, api_password: process.env.SMSWBS_PASSWORD, fromNum: '50004001764868', toNum: ['09105247414'], messageContent: 'فیروزو' });
  const r5 = await testPath('/class/sms/restful/sendSms_Pattern.php', { fromNum: '3000505', toNum: '09105247414', user: process.env.SMSWBS_USERNAME, pass: process.env.SMSWBS_PASSWORD, pattern_code: '1412', input_data: [{ code: '123456' }] });
  console.log(JSON.stringify([r1, r2, r3, r4, r5], null, 2));
}

run();
