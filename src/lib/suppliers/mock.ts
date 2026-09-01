import { TravelSupplier } from './types';

// A mock supplier that simulates external API behavior (useful for dev and testing)
export class MockFlightSupplier implements TravelSupplier {
  id = 'mock-flight-01';
  name = 'Mock Airline API';
  type = 'FLIGHT' as const;

  async search(_params: Record<string, unknown>) {
    void _params;
    // Simulate delay
    await new Promise(r => setTimeout(r, 500));
    
    return [
      { id: 'f-1', airline: 'Iran Air', price: 15000000, currency: 'IRR', available: true },
      { id: 'f-2', airline: 'Mahan', price: 17000000, currency: 'IRR', available: true }
    ];
  }

  async quote(id: string, _params: Record<string, unknown>) {
    void _params;
    return {
      price: id === 'f-1' ? 15000000 : 17000000,
      currency: 'IRR',
      available: true
    };
  }

  async book(_quoteId: string, _passengers: Record<string, unknown>[]) {
    void _quoteId;
    void _passengers;
    // 5% chance of failure to test the Operations Queue / Saga compensation
    if (Math.random() < 0.05) {
      return { success: false, error: 'Supplier API timed out' };
    }
    
    return { 
      success: true, 
      externalPnr: 'PNR-' + Math.random().toString(36).substring(7).toUpperCase()
    };
  }

  async cancel(_externalPnr: string) {
    void _externalPnr;
    return { success: true, refundAmount: 15000000 };
  }
}

// Registry to hold all active suppliers
export const SupplierRegistry: Record<string, TravelSupplier> = {
  'mock-flight-01': new MockFlightSupplier(),
  // Real suppliers (e.g. Amadeus, Parto) can be registered here in the future
};
