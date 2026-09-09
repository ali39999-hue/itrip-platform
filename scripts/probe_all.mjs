async function probeUrls() {
  const hosts = [
    'http://smswbs.ir',
    'https://smswbs.ir',
    'http://sms.hupa.ir',
    'https://sms.hupa.ir',
    'http://smshooshmand.com',
    'https://smshooshmand.com'
  ];
  const paths = [
    '/class/sms/webservice/sendPattern.php',
    '/class/sms/webservice/sendpattern.php',
    '/class/sms/restful/sendPattern.php',
    '/class/sms/restful/sendpattern.php',
    '/class/sms/restful/sendSms_Pattern.php',
    '/class/sms/restful/send_Pattern.php',
    '/class/sms/restful/OTP/send_OTP.php'
  ];

  for (const h of hosts) {
    for (const p of paths) {
      const url = h + p;
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
          signal: AbortSignal.timeout(3000)
        });
        if (res.status !== 404) {
          const text = await res.text();
          console.log(`FOUND: [${res.status}] ${url} => ${text.slice(0, 80)}`);
        }
      } catch (e) {
        // ignore timeout/network
      }
    }
  }
}
probeUrls();
