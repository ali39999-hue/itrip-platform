'use server';

import { SimService, type SimCatalogResult } from '@/services/sim-service';

export async function getSimCatalogAction(): Promise<{ success: true; data: SimCatalogResult } | { success: false; error: string }> {
  try {
    const data = await SimService.getCatalog();
    return { success: true, data };
  } catch (err: unknown) {
    console.error('getSimCatalogAction error:', err);
    return { success: false, error: 'Failed to fetch SIM catalog' };
  }
}
