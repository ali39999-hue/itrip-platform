(async () => {
  const base = 'http://localhost:3000';
  const r1 = await fetch(base + '/api/auth/csrf');
  const cookie1 = r1.headers.getSetCookie ? r1.headers.getSetCookie() : [r1.headers.get('set-cookie')];
  const { csrfToken } = await r1.json();
  const cookies = cookie1.map((c) => c.split(';')[0]).join('; ');
  console.log('csrf ok:', Boolean(csrfToken));
  const body = new URLSearchParams({ identifier: '09123456789', password: '12345', channel: 'otp', csrfToken });
  const r2 = await fetch(base + '/api/auth/callback/credentials', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: cookies },
    body: body.toString(),
    redirect: 'manual',
  });
  console.log('status:', r2.status);
  console.log('location:', r2.headers.get('location'));
  const text = await r2.text();
  console.log('body snippet:', text.slice(0, 400).replace(/\n/g, ' '));
})().catch((e) => {
  console.error('ERR', e);
  process.exit(1);
});
