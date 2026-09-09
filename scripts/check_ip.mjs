async function checkIp() {
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    console.log('NODE IP:', await res.json());
  } catch (e) {
    console.log('NODE IP ERR:', e.message);
  }
}
checkIp();
