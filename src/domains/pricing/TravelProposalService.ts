export interface ProposalServiceItem {
  type: 'FLIGHT' | 'HOTEL' | 'TOUR' | 'TRANSFER' | 'VISA' | 'INSURANCE';
  title: string;
  description?: string;
  unitCost: number;
  quantity: number;
  daysOrNights?: number;
}

export interface ProposalInput {
  clientName: string;
  clientCompany?: string;
  clientEmail?: string;
  clientPhone?: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  paxCount: number;
  agentMarkupPercent?: number; // e.g. 0.08 for 8%
  taxPercent?: number; // e.g. 0.09 for 9% VAT
  currency?: string;
  items: ProposalServiceItem[];
  notes?: string;
}

export interface TravelProposal {
  proposalNumber: string;
  createdAt: string;
  validUntil: string;
  clientName: string;
  clientCompany?: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  paxCount: number;
  currency: string;
  items: Array<{
    title: string;
    type: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
  subtotalAmount: number;
  agentMarkupAmount: number;
  taxAmount: number;
  totalClientAmount: number;
  notes?: string;
}

export class TravelProposalService {
  /**
   * Generates a formal commercial travel proposal and quotation (Voyant / ExcursioX pattern).
   */
  static createProposal(input: ProposalInput): TravelProposal {
    const markupRate = input.agentMarkupPercent ?? 0.08;
    const taxRate = input.taxPercent ?? 0.09;
    const currency = input.currency || 'IRR';

    let subtotal = 0;

    const formattedItems = input.items.map((item) => {
      const multiplier = item.daysOrNights || 1;
      const lineCost = item.unitCost * item.quantity * multiplier;
      const lineWithMarkup = Math.round(lineCost * (1 + markupRate));
      subtotal += lineWithMarkup;

      return {
        title: item.title,
        type: item.type,
        quantity: item.quantity,
        unitPrice: Math.round(item.unitCost * (1 + markupRate)),
        subtotal: lineWithMarkup,
      };
    });

    const markupAmount = Math.round(subtotal * (markupRate / (1 + markupRate)));
    const taxAmount = Math.round(subtotal * taxRate);
    const totalClientAmount = subtotal + taxAmount;

    const now = new Date();
    const validUntil = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48-hour quotation validity

    return {
      proposalNumber: `PROP-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: now.toISOString().slice(0, 10),
      validUntil: validUntil.toISOString().slice(0, 10),
      clientName: input.clientName,
      clientCompany: input.clientCompany,
      destination: input.destination,
      departureDate: input.departureDate,
      returnDate: input.returnDate,
      paxCount: input.paxCount,
      currency,
      items: formattedItems,
      subtotalAmount: subtotal,
      agentMarkupAmount: markupAmount,
      taxAmount,
      totalClientAmount,
      notes: input.notes,
    };
  }
}
