async function testHotelDetailPage() {
  const ids = ['h1', 'ir_2069', 'ht-darvishi'];
  for (const id of ids) {
    try {
      const res = await fetch(`http://localhost:3000/fa/hotels/${id}`);
      console.log(`[${res.status}] /fa/hotels/${id} -> URL: ${res.url}`);
    } catch (e) {
      console.error(e.message);
    }
  }
}
testHotelDetailPage();
