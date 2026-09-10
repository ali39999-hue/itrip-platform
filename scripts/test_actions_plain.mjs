async function testActions() {
  const { getPublicToursAction, getPublicExperiencesAction } = await import('../src/actions/content.ts');

  console.log('Testing getPublicToursAction...');
  const toursRes = await getPublicToursAction();
  console.log('Tours success:', toursRes.success, 'count:', toursRes.tours?.length);
  if (toursRes.tours && toursRes.tours.length > 0) {
    const t0 = toursRes.tours[0];
    console.log('Tour[0].price type:', typeof t0.price, 'val:', t0.price);
    console.log('Tour[0] constructor:', t0.price?.constructor?.name);
  }

  console.log('Testing getPublicExperiencesAction...');
  const expRes = await getPublicExperiencesAction();
  console.log('Experiences success:', expRes.success, 'count:', expRes.experiences?.length);
  if (expRes.experiences && expRes.experiences.length > 0) {
    const e0 = expRes.experiences[0];
    console.log('Experience[0].fromPrice type:', typeof e0.fromPrice, 'val:', e0.fromPrice);
  }
}

testActions().catch(console.error);
