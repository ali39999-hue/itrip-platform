// Reproduces EXACTLY what ProductionSmswbsProvider.sendOtp sends, plus a sender-line variant.
// Sends one real OTP SMS to the configured test number.
// Credentials come from env (SMSWBS_USERNAME / SMSWBS_PASSWORD) — never hardcode them:
// this repository is PUBLIC.
const uname = process.env.SMSWBS_USERNAME;
const pass = process.env.SMSWBS_PASSWORD;
if (!uname || !pass) {
  console.error("Set SMSWBS_USERNAME and SMSWBS_PASSWORD in the environment before running.");
  process.exit(1);
}

const to = process.env.SMSWBS_TEST_TO || "+989105247414";
const tests = [
  {
    name: "send_OTP sender=SMSWBS_SENDER(+989999178755) [exact app payload]",
    payload: {
      uname,
      pass,
      from: process.env.SMSWBS_SENDER || "+989999178755",
      to,
      msg: "کد تایید ورود به فیروزو",
      extra: { len: 4, time: 2, lang: "fa", sign: "فیروزو" },
    },
  },
  {
    name: "send_OTP sender=SMS_SENDER_LINE(50004001764868)",
    payload: {
      uname,
      pass,
      from: process.env.SMS_SENDER_LINE || "50004001764868",
      to,
      msg: "کد تایید ورود به فیروزو",
      extra: { len: 4, time: 2, lang: "fa", sign: "فیروزو" },
    },
  },
];

for (const t of tests) {
  const start = Date.now();
  try {
    const res = await fetch("http://smswbs.ir/class/sms/restful/OTP/send_OTP.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(t.payload),
      signal: AbortSignal.timeout(15000),
    });
    const text = await res.text();
    console.log(`[${t.name}] STATUS ${res.status} (${Date.now() - start}ms):`, text.slice(0, 300));
  } catch (e) {
    console.log(`[${t.name}] FAILED (${Date.now() - start}ms):`, e.message);
  }
}
