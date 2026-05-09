'use client';

import { formatINR } from '@/lib/currency';

interface Expense {
  id: string;
  amount: number;
  category: string;
  date: string;
  note?: string;
  budgetType?: string;
}

interface TodaySpendingProps {
  expenses: Expense[];
  budgetType: 'personal' | 'family';
}

export default function TodaySpending({ expenses, budgetType }: TodaySpendingProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayExpenses = expenses.filter((expense) => {
    const expenseDate = new Date(expense.date);
    expenseDate.setHours(0, 0, 0, 0);
    return expenseDate.getTime() === today.getTime();
  });

  const totalToday = todayExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const transactionCount = todayExpenses.length;

  const categoryTotals: Record<string, number> = {};
  todayExpenses.forEach((exp) => {
    categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
  });
  const topCategory = Object.entries(categoryTotals).sort(([, a], [, b]) => b - a)[0];

  const accentColor = budgetType === 'family' ? 'apple-purple' : 'apple-orange';

  return (
    <div className="bg-card rounded-2xl shadow-apple-sm p-4 sm:p-5 animate-in">
      <div className="flex items-start gap-3">
        {/* Tinted icon chip */}
        <div className={`w-10 h-10 rounded-xl bg-${accentColor}/15 flex items-center justify-center shrink-0`}>
          <svg className={`w-5 h-5 text-${accentColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-foreground">Today</h3>
            <p className="text-[11px] text-muted-foreground">
              {today.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
            </p>
          </div>

          <p className={`text-3xl font-bold tabular-nums mt-1 ${
            totalToday > 0 ? 'text-foreground' : 'text-muted-foreground'
          }`}>
            {formatINR(totalToday)}
          </p>

          <div className="flex items-center gap-2.5 mt-2 flex-wrap">
            {transactionCount > 0 ? (
              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-${accentColor}/10 text-${accentColor}`}>
                {transactionCount} {transactionCount === 1 ? 'transaction' : 'transactions'}
              </span>
            ) : null}

            {topCategory && (
              <span className="text-xs text-muted-foreground truncate">
                Top: <span className="font-medium text-foreground">{topCategory[0]}</span>
              </span>
            )}

            {transactionCount === 0 && (
              <span className="text-xs text-muted-foreground">No expenses yet today ✨</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
