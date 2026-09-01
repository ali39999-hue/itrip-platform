import { getLocale } from 'next-intl/server';
import { getAdminFinanceStats } from '@/actions/admin';
import { FinanceClientPage } from './FinanceClientPage';

export default async function AdminFinancePage() {
  const locale = await getLocale();
  const result = await getAdminFinanceStats();
  
  const balances = result.balances || { IRR: 0, USDT: 0, AED: 0 };
  const inflow = result.inflow || 0;
  const outflow = result.outflow || 0;
  const transactions = result.recentTransactions || [];

  return (
    <FinanceClientPage 
       locale={locale} 
       balances={balances} 
       inflow={inflow} 
       outflow={outflow} 
       transactions={transactions} 
    />
  );
}