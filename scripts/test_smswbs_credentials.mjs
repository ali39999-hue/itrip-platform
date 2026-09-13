// Non-destructive SMSWBS credential test: check_OTP with a dummy code never sends SMS.
// A valid credential + wrong code => "invalid code" style error.
// A bad credential => auth error, distinguishable.
// Credentials come from env (SMSWBS_USERNAME / SMSWBS_CANDIDATE_PASSES) — never hardcode them:
// this repository is PUBLIC.
const uname = process.env.SMSWBS_USERNAME;
if (!uname) {
  console.error("Set SMSWBS_USERNAME and optionally SMSWBS_CANDIDATE_PASSES before running.");
  process.exit(1);
}
const passes = (process.env.SMSWBS_CANDIDATE_PASSES || process.env.SMSWBS_PASSWORD || "")
  .split(",")
  .map((p) => p.trim())
  .filter(Boolean);

if (passes.length === 0) {
  console.error("No candidate passwords provided (SMSWBS_CANDIDATE_PASSES or SMSWBS_PASSWORD).");
  process.exit(1);
}

const tests = passes.map((pass) => ({ name: `check_OTP pass(len=${pass.length})`, pass }));

for (const t of tests) {
  const start = Date.now();
  try {
    const res = await fetch("http://smswbs.ir/class/sms/restful/OTP/check_OTP.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uname,
        pass: t.pass,
        code: "000000",
        to: process.env.SMSWBS_TEST_TO || "+989105247414",
      }),
      signal: AbortSignal.timeout(15000),
    });
    const text = await res.text();
    console.log(`[${t.name}] STATUS ${res.status} (${Date.now() - start}ms):`, text.slice(0, 300));
  } catch (e) {
    console.log(`[${t.name}] FAILED (${Date.now() - start}ms):`, e.message);
  }
}
