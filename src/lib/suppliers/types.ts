export interface TravelSupplier {
  id: string;
  name: string;
  type: 'HOTEL' | 'FLIGHT' | 'TOUR' | 'TRANSFER' | 'INSURANCE' | 'VISA' | 'MOCK';

  // Search inventory
  search(params: any): Promise<any>;
  
  // Get latest price/availability
  quote(id: string, params: any): Promise<{ price: number; currency: string; available: boolean }>;
  
  // Finalize booking on supplier side
  book(quoteId: string, passengers: any[]): Promise<{ success: boolean; externalPnr?: string; error?: string }>;
  
  // Cancel/Refund
  cancel(externalPnr: string): Promise<{ success: boolean; refundAmount: number }>;
}