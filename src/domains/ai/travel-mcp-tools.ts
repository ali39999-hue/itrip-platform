/**
 * Model Context Protocol (MCP) Standard Tool Definitions for Travel Search & Grounding.
 * Adapted from travel_planner (MCP + LangChain) and OTAIP patterns.
 */

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
  };
}

export const TRAVEL_MCP_TOOLS: McpToolDefinition[] = [
  {
    name: 'search_flights',
    description: 'Searches real flight availability and allotments in Firuzo platform.',
    inputSchema: {
      type: 'object',
      properties: {
        origin: { type: 'string', description: '3-letter IATA code, e.g. THR, IKA, MHD' },
        destination: { type: 'string', description: '3-letter IATA code, e.g. IST, DXB, TBS' },
        departureDate: { type: 'string', description: 'YYYY-MM-DD travel date' },
        passengers: { type: 'number', description: 'Adult passenger count', default: 1 },
        cabinClass: { type: 'string', enum: ['economy', 'business'], default: 'economy' },
      },
      required: ['origin', 'destination', 'departureDate'],
    },
  },
  {
    name: 'search_hotels',
    description: 'Searches verified accommodations and room allotments in Firuzo platform.',
    inputSchema: {
      type: 'object',
      properties: {
        city: { type: 'string', description: 'Destination city name in Persian or English' },
        checkInDate: { type: 'string', description: 'YYYY-MM-DD check-in date' },
        checkOutDate: { type: 'string', description: 'YYYY-MM-DD check-out date' },
        guests: { type: 'number', default: 2 },
        minStars: { type: 'number', default: 4 },
      },
      required: ['city', 'checkInDate', 'checkOutDate'],
    },
  },
  {
    name: 'estimate_trip_budget',
    description: 'Computes realistic travel budget allocation for a destination and party size.',
    inputSchema: {
      type: 'object',
      properties: {
        destination: { type: 'string', description: 'Country id, e.g. turkey, uae, iran' },
        paxCount: { type: 'number', default: 2 },
        durationDays: { type: 'number', default: 4 },
        tier: { type: 'string', enum: ['economy', 'balanced', 'luxury'], default: 'balanced' },
      },
      required: ['destination', 'durationDays'],
    },
  },
];

export class TravelMcpToolsService {
  /**
   * Returns registered MCP tool descriptors for AI agents and assistants
   */
  static getRegisteredTools(): McpToolDefinition[] {
    return TRAVEL_MCP_TOOLS;
  }

  /**
   * Validates tool input and dispatches execution
   */
  static async executeTool(
    toolName: string,
    args: Record<string, unknown>
  ): Promise<{ success: boolean; result?: unknown; error?: string }> {
    const tool = TRAVEL_MCP_TOOLS.find((t) => t.name === toolName);
    if (!tool) {
      return { success: false, error: `MCP tool "${toolName}" is not recognized` };
    }

    // Mock/Service dispatch handler
    if (toolName === 'estimate_trip_budget') {
      const days = Number(args.durationDays || 4);
      const pax = Number(args.paxCount || 1);
      const tier = String(args.tier || 'balanced');
      const baseDaily = tier === 'luxury' ? 40_000_000 : tier === 'balanced' ? 12_000_000 : 4_500_000;
      const total = baseDaily * days * pax;

      return {
        success: true,
        result: {
          destination: args.destination,
          days,
          pax,
          tier,
          totalEstimatedToman: total,
          currency: 'IRT',
          breakdown: {
            stay: Math.round(total * 0.4),
            transport: Math.round(total * 0.3),
            foodAndDining: Math.round(total * 0.2),
            activities: Math.round(total * 0.1),
          },
        },
      };
    }

    return {
      success: true,
      result: {
        tool: toolName,
        status: 'READY',
        params: args,
      },
    };
  }
}
