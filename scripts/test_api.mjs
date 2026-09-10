async function testApi() {
  const urls = [
    'http://localhost:3000/api/hotels/search',
    'http://localhost:3000/api/hotels/search?q=%D9%85%D8%B4%D9%87%D8%AF',
    'http://localhost:3000/api/hotels/search?city=%D9%85%D8%B4%D9%87%D8%AF',
    'http://localhost:3000/api/flights/search',
    'http://localhost:3000/api/flights/search?from=%D8%AA%D9%87%D8%B1%D8%A7%D9%86&to=%D9%85%D8%B4%D9%87%D8%AF'
  ];

  for (const u of urls) {
    try {
      const res = await fetch(u);
      const json = await res.json();
      console.log(`[${res.status}] ${u}`);
      console.log('Keys:', Object.keys(json));
      if (json.data) {
        console.log('Data items count:', json.data.hotels?.length ?? json.data.flights?.length ?? json.data.length);
      }
    } catch (e) {
      console.error('Failed:', u, e.message);
    }
  }
}

testApi();
