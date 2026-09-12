import { prisma } from '../src/lib/prisma.js';
import { getDemoPaymentPreview, simulateEcardoPayment } from '../src/actions/demo-payment.js';

async function testDemoFlow() {
  console.log('Testing demo payment flow...');
  const ref = `FZTEST${Date.now().toString(36).slice(-6).toUpperCase()}`;

  // Create a pending test payment
  const payment = await prisma.payment.create({
    data: {
      idempotencyKey: `test_idem_${ref}`,
      gatewayRef: ref,
      amount: 1250000,
      currency: 'IRR',
      status: 'PENDING',
      method: 'gateway_ecardo',
      bookingId: 'test_book_123',
    },
  });

  console.log('Created payment:', payment.gatewayRef);

  const preview = await getDemoPaymentPreview(ref);
  console.log('Preview result:', preview);
  if (!preview.success) {
    throw new Error('Preview failed: ' + preview.error);
  }

  console.log('Simulating payment success...');
  const sim = await simulateEcardoPayment(ref, 'success');
  console.log('Simulation result:', sim);

  // Clean up
  await prisma.payment.deleteMany({ where: { gatewayRef: ref } });
  console.log('Test completed successfully!');
}

testDemoFlow().catch(console.error);
