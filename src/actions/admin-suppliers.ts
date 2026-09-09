'use server';

import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/domains/identity/permission-service';
import { revalidatePath } from 'next/cache';

export async function getSupplierDetail(supplierId: string) {
  await requirePermission('inventory:manage');
  
  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
    include: {
      contracts: { orderBy: { createdAt: 'desc' } },
      connections: {
        include: { credentials: { orderBy: { createdAt: 'desc' } } },
        orderBy: { createdAt: 'desc' },
      },
      healthRecords: {
        orderBy: { windowStart: 'desc' },
        take: 30, // last 30 windows
      },
      _count: { select: { inventoryItems: true, statements: true } }
    },
  });

  if (!supplier) throw new Error('Supplier not found');
  
  // Cast decimals to numbers for client safety
  return {
    ...supplier,
    contracts: supplier.contracts.map(c => ({
      ...c,
      commission: c.commission.toNumber(),
      creditLimit: c.creditLimit.toNumber(),
    }))
  };
}

export async function addSupplierConnection(data: {
  supplierId: string;
  productType: string;
  baseUrl: string;
  environment: string;
  timeoutMs: number;
}) {
  await requirePermission('inventory:manage');
  
  const conn = await prisma.supplierConnection.create({
    data: {
      supplierId: data.supplierId,
      productType: data.productType,
      baseUrl: data.baseUrl,
      environment: data.environment,
      timeoutMs: data.timeoutMs,
    },
  });
  
  revalidatePath(`/admin/suppliers/${data.supplierId}`);
  return { success: true, connectionId: conn.id };
}

export async function rotateSupplierCredential(data: {
  connectionId: string;
  supplierId: string;
  credentialRef: string;
}) {
  await requirePermission('inventory:manage');
  
  await prisma.$transaction(async (tx) => {
    // Deprecate old active credentials for this connection
    await tx.supplierCredential.updateMany({
      where: { supplierConnectionId: data.connectionId, rotationState: 'ACTIVE' },
      data: { rotationState: 'DEPRECATED', expiresAt: new Date(Date.now() + 24 * 3600 * 1000) },
    });
    
    // Create new active credential
    await tx.supplierCredential.create({
      data: {
        supplierConnectionId: data.connectionId,
        credentialRef: data.credentialRef,
        rotationState: 'ACTIVE',
      },
    });
  });

  revalidatePath(`/admin/suppliers/${data.supplierId}`);
  return { success: true };
}
