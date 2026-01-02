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
  // Get today's date in local timezone (start of day)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Filter expenses for today
  const todayExpenses = expenses.filter((expense) => {
    const expenseDate = new Date(expense.date);
    expenseDate.setHours(0, 0, 0, 0);
    return expenseDate.getTime() === today.getTime();
  });

  const totalToday = todayExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const transactionCount = todayExpenses.length;

  // Get the top category for today
  const categoryTotals: Record<string, number> = {};
  todayExpenses.forEach((exp) => {
    categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
  });
  const topCategory = Object.entries(categoryTotals).sort(([, a], [, b]) => b - a)[0];

  return (
    <div className={`relative overflow-hidden rounded-2xl border shadow-sm transition-all duration-300 ${
      budgetType === 'family'
        ? 'bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800'
        : 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800'
    }`}>
      {/* Decorative background element */}
      <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-20 ${
        budgetType === 'family' ? 'bg-purple-300 dark:bg-purple-600' : 'bg-amber-300 dark:bg-amber-600'
      }`} />
      
      <div className="relative p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 ${
            budgetType === 'family'
              ? 'bg-gradient-to-br from-purple-500 to-pink-600'
              : 'bg-gradient-to-br from-amber-500 to-orange-600'
          }`}>
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Today&apos;s Spending</h3>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">
              {today.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
            </p>
          </div>
        </div>

        {/* Amount */}
        <div className="mb-3">
          <p className={`text-2xl sm:text-3xl font-bold ${
            totalToday > 0
              ? budgetType === 'family'
                ? 'text-purple-700 dark:text-purple-300'
                : 'text-amber-700 dark:text-amber-300'
              : 'text-gray-400 dark:text-gray-500'
          }`}>
            {formatINR(totalToday)}
          </p>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 text-xs">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${
            budgetType === 'family'
              ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
              : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
          }`}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span className="font-medium">
              {transactionCount} {transactionCount === 1 ? 'transaction' : 'transactions'}
            </span>
          </div>
          
          {topCategory && (
            <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 truncate">
              <span className="text-xs">Top:</span>
              <span className="font-medium truncate">{topCategory[0]}</span>
            </div>
          )}
        </div>

        {/* No spending today message */}
        {transactionCount === 0 && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">
            No expenses recorded today yet ✨
          </p>
        )}
      </div>
    </div>
  );
}

