async function checkIranIp() {
  const urls = [
    'https://api.myip.com',
    'https://api.chabok.io/ip',
    'https://ipinfo.io/json'
  ];
  for (const u of urls) {
    try {
      const res = await fetch(u, { signal: AbortSignal.timeout(5000) });
      console.log(u, await res.text());
    } catch (e) {
      console.log(u, e.message);
    }
  }
}
checkIranIp();
