export interface TripMember {
  id: string;
  name: string;
}

export interface TripExpenseItem {
  id: string;
  title: string;
  amount: number;
  currency: string;
  payerId: string;
  participantIds: string[]; // Who shared this expense
  category?: 'FOOD' | 'TRANSPORT' | 'STAY' | 'TICKET' | 'OTHER';
}

export interface DebtTransfer {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
  currency: string;
}

export interface ExpenseSplitSummary {
  totalSpent: number;
  currency: string;
  memberBalances: Record<
    string,
    {
      name: string;
      totalPaid: number;
      totalOwed: number;
      netBalance: number; // positive = creditor, negative = debtor
    }
  >;
  settlements: DebtTransfer[];
}

export class ExpenseSplitterService {
  /**
   * Computes individual balances and minimal settlement transfers (TREK / JourniPlan pattern).
   */
  static calculateSplit(
    members: TripMember[],
    expenses: TripExpenseItem[],
    currency = 'IRR'
  ): ExpenseSplitSummary {
    const balances: Record<
      string,
      { name: string; totalPaid: number; totalOwed: number; netBalance: number }
    > = {};

    members.forEach((m) => {
      balances[m.id] = {
        name: m.name,
        totalPaid: 0,
        totalOwed: 0,
        netBalance: 0,
      };
    });

    let totalSpent = 0;

    for (const exp of expenses) {
      totalSpent += exp.amount;

      // Payer contributed full amount
      if (balances[exp.payerId]) {
        balances[exp.payerId].totalPaid += exp.amount;
      }

      // Shared among participants
      const participants =
        exp.participantIds && exp.participantIds.length > 0
          ? exp.participantIds
          : members.map((m) => m.id);

      const splitAmount = Math.round(exp.amount / participants.length);

      for (const pId of participants) {
        if (balances[pId]) {
          balances[pId].totalOwed += splitAmount;
        }
      }
    }

    // Compute net balance: paid - owed
    for (const m of members) {
      const b = balances[m.id];
      if (b) {
        b.netBalance = b.totalPaid - b.totalOwed;
      }
    }

    // Greedy debt settlement algorithm to minimize transaction count
    const debtors: Array<{ id: string; name: string; amount: number }> = [];
    const creditors: Array<{ id: string; name: string; amount: number }> = [];

    for (const [id, b] of Object.entries(balances)) {
      if (b.netBalance < -1) {
        debtors.push({ id, name: b.name, amount: -b.netBalance });
      } else if (b.netBalance > 1) {
        creditors.push({ id, name: b.name, amount: b.netBalance });
      }
    }

    const settlements: DebtTransfer[] = [];
    let dIdx = 0;
    let cIdx = 0;

    while (dIdx < debtors.length && cIdx < creditors.length) {
      const debtor = debtors[dIdx];
      const creditor = creditors[cIdx];
      const settledAmount = Math.min(debtor.amount, creditor.amount);

      if (settledAmount > 0) {
        settlements.push({
          fromId: debtor.id,
          fromName: debtor.name,
          toId: creditor.id,
          toName: creditor.name,
          amount: settledAmount,
          currency,
        });

        debtor.amount -= settledAmount;
        creditor.amount -= settledAmount;
      }

      if (debtor.amount <= 1) dIdx++;
      if (creditor.amount <= 1) cIdx++;
    }

    return {
      totalSpent,
      currency,
      memberBalances: balances,
      settlements,
    };
  }
}
