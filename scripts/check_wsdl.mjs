async function checkWsdl() {
  const urls = [
    'http://smswbs.ir/class/sms/wsdlservice/server.php?wsdl',
    'http://sms.hupa.ir/class/sms/wsdlservice/server.php?wsdl',
    'https://sms.hupa.ir/class/sms/wsdlservice/server.php?wsdl'
  ];
  for (const u of urls) {
    try {
      const res = await fetch(u, { signal: AbortSignal.timeout(5000) });
      const text = await res.text();
      console.log(u, res.status, text.slice(0, 150));
    } catch (e) {
      console.log(u, 'ERR:', e.message);
    }
  }
}
checkWsdl();
