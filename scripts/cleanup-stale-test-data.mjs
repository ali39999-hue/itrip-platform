import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

// 1. Suppliers created by test fixtures ("Test Supplier") and their cascades
const testSuppliers = await p.supplier.findMany({ where: { name: 'Test Supplier' }, select: { id: true } });
const testSupplierIds = testSuppliers.map((s) => s.id);
console.log('Test suppliers to delete:', testSupplierIds.length);

const allSuppliers = await p.supplier.findMany({ select: { id: true } });
const realSupplierIds = new Set(allSuppliers.map((s) => s.id));

// 2. Operational exceptions whose target entity no longer exists
const exceptions = await p.operationalException.findMany({ select: { id: true, entityType: true, entityId: true } });
const staleExceptionIds = [];
for (const e of exceptions) {
  if (e.entityType === 'SUPPLIER' && e.entityId && !realSupplierIds.has(e.entityId)) {
    staleExceptionIds.push(e.id);
  } else if (e.entityType === 'BOOKING' && e.entityId) {
    const b = await p.booking.findUnique({ where: { id: e.entityId }, select: { id: true } });
    if (!b) staleExceptionIds.push(e.id);
  }
}
console.log('Stale exceptions to delete:', staleExceptionIds.length);

// 3. Orphaned REFUND ledger rows (reference booking ids that no longer exist)
const refundRows = await p.ledgerEntry.findMany({
  where: { referenceType: 'REFUND' },
  select: { id: true, referenceId: true },
});
const orphanRefundIds = [];
for (const r of refundRows) {
  if (!r.referenceId) { orphanRefundIds.push(r.id); continue; }
  const b = await p.booking.findUnique({ where: { id: r.referenceId }, select: { id: true } });
  if (!b) orphanRefundIds.push(r.id);
}
console.log('Orphaned REFUND ledger rows:', orphanRefundIds.length);

// 4. Payments pointing at bookings that no longer exist
const payments = await p.payment.findMany({ select: { id: true, bookingId: true } });
const stalePaymentIds = [];
for (const pay of payments) {
  if (pay.bookingId) {
    const b = await p.booking.findUnique({ where: { id: pay.bookingId }, select: { id: true } });
    if (!b) stalePaymentIds.push(pay.id);
  }
}
console.log('Stale payments to delete:', stalePaymentIds.length);

// Execute deletions
if (staleExceptionIds.length) {
  const d = await p.operationalException.deleteMany({ where: { id: { in: staleExceptionIds } } });
  console.log('deleted exceptions:', d.count);
}
if (orphanRefundIds.length) {
  const d = await p.ledgerEntry.deleteMany({ where: { id: { in: orphanRefundIds } } });
  console.log('deleted orphan refund ledger rows:', d.count);
}
if (stalePaymentIds.length) {
  const d = await p.payment.deleteMany({ where: { id: { in: stalePaymentIds } } });
  console.log('deleted stale payments:', d.count);
}
if (testSupplierIds.length) {
  // explicit cascade cleanup, then suppliers
  await p.inventoryHold.deleteMany({ where: { inventoryItem: { supplierId: { in: testSupplierIds } } } });
  await p.allotment.deleteMany({ where: { inventoryItem: { supplierId: { in: testSupplierIds } } } });
  await p.inventoryItem.deleteMany({ where: { supplierId: { in: testSupplierIds } } });
  await p.supplierCredential.deleteMany({ where: { connection: { supplierId: { in: testSupplierIds } } } });
  await p.supplierConnection.deleteMany({ where: { supplierId: { in: testSupplierIds } } });
  await p.supplierHealth.deleteMany({ where: { supplierId: { in: testSupplierIds } } });
  await p.supplierStatement.deleteMany({ where: { supplierId: { in: testSupplierIds } } });
  await p.supplierContract.deleteMany({ where: { supplierId: { in: testSupplierIds } } });
  const d = await p.supplier.deleteMany({ where: { id: { in: testSupplierIds } } });
  console.log('deleted test suppliers:', d.count);
}

const remaining = {
  suppliers: await p.supplier.count(),
  exceptions: await p.operationalException.count(),
  refundLedger: await p.ledgerEntry.count({ where: { referenceType: 'REFUND' } }),
  bookings: await p.booking.count(),
};
console.log('Remaining:', JSON.stringify(remaining));
await p.$disconnect();
