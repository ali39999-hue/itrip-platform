async function run() {
  const tests = [
    {
      name: "OneToMany - form urlencoded",
      url: "http://smswbs.ir/class/sms/restful/sendSms_OneToMany.php",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        username: "09123764868",
        password: "Hvd1367++@",
        fromNum: "50004001764868",
        toNum: "09105247414",
        messageContent: "تست فیروزو"
      }).toString()
    },
    {
      name: "OneToMany - json with api_password",
      url: "http://smswbs.ir/class/sms/restful/sendSms_OneToMany.php",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "09123764868",
        api_password: "Hvd1367++@",
        fromNum: "50004001764868",
        toNum: ["09105247414"],
        messageContent: "تست فیروزو"
      })
    },
    {
      name: "OneToMany - json with from/to/text",
      url: "http://smswbs.ir/class/sms/restful/sendSms_OneToMany.php",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "09123764868",
        api_password: "Hvd1367++@",
        from: "50004001764868",
        to: ["09105247414"],
        text: "تست فیروزو"
      })
    },
    {
      name: "OTP - send_OTP with 30s timeout",
      url: "http://smswbs.ir/class/sms/restful/OTP/send_OTP.php",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "09123764868",
        api_password: "Hvd1367++@",
        mobile: "09105247414",
        footer: "فیروزو"
      })
    }
  ];

  for (const t of tests) {
    const start = Date.now();
    try {
      const res = await fetch(t.url, {
        method: "POST",
        headers: t.headers,
        body: t.body,
        signal: AbortSignal.timeout(20000)
      });
      const text = await res.text();
      console.log(`[${t.name}] STATUS: ${res.status} (${Date.now() - start}ms):`, text.slice(0, 150));
    } catch (e) {
      console.log(`[${t.name}] FAILED (${Date.now() - start}ms):`, e.message);
    }
  }
}
run();
