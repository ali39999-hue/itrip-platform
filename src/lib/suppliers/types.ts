export interface TravelSupplier {
  id: string;
  name: string;
  type: 'HOTEL' | 'FLIGHT' | 'TOUR' | 'TRANSFER' | 'INSURANCE' | 'VISA' | 'MOCK';

  // Search inventory
  search(params: Record<string, unknown>): Promise<unknown>;
  
  // Get latest price/availability
  quote(id: string, params: Record<string, unknown>): Promise<{ price: number; currency: string; available: boolean }>;
  
  // Finalize booking on supplier side
  book(quoteId: string, passengers: Record<string, unknown>[]): Promise<{ success: boolean; externalPnr?: string; error?: string }>;
  
  // Cancel/Refund
  cancel(externalPnr: string): Promise<{ success: boolean; refundAmount: number }>;
}
