'use client';

import { useEffect, useState } from 'react';
import { formatINR } from '@/lib/currency';
import ThemeToggle from './ThemeToggle';
import AIInsights from './AIInsights';
import AIAlerts from './AIAlerts';
import { storage } from '@/lib/storage';

interface BudgetData {
  budget: { amount: number } | null;
  summary: {
    month: number;
    year: number;
    totalSpent: number;
    budgetAmount: number | null;
    remaining: number | null;
    expenseCount: number;
  };
  categoryBreakdown: Record<string, number>;
  expenses: Array<{
    id: string;
    amount: number;
    category: string;
    date: string;
    note?: string;
  }>;
}

interface BudgetDashboardProps {
  onResetSuccess?: () => void;
}

export default function BudgetDashboard({ onResetSuccess }: BudgetDashboardProps = {}) {
  const [data, setData] = useState<BudgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [budgetAmount, setBudgetAmount] = useState('');
  const [settingBudget, setSettingBudget] = useState(false);
  const [resettingBudget, setResettingBudget] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState<{
    suggestedAmount: number;
    reasoning: string;
  } | null>(null);
  const [loadingRecommendation, setLoadingRecommendation] = useState(false);

  const fetchAIRecommendation = async () => {
    setLoadingRecommendation(true);
    try {
      const token = await storage.getItem('accessToken');
      if (!token) return;

      const response = await fetch(
        `/api/ai/budget-recommendation?month=${month}&year=${year}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        }
      );

      if (response.ok) {
        const recommendation = await response.json();
        setAiRecommendation(recommendation);
      }
    } catch (error) {
      console.error('Error fetching AI recommendation:', error);
    } finally {
      setLoadingRecommendation(false);
    }
  };

  const fetchData = async () => {
    try {
      const token = await storage.getItem('accessToken');
      if (!token) return;

      const response = await fetch(
        `/api/budget?month=${month}&year=${year}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        }
      );

      if (!response.ok) throw new Error('Failed to fetch budget data');
      const result = await response.json();
      setData(result);

      // Fetch AI recommendation if no budget is set
      if (!result.budget) {
        fetchAIRecommendation();
      }
    } catch (err) {
      setError('Failed to load budget data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [month, year]);

  const handleSetBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingBudget(true);

    try {
      const token = await storage.getItem('accessToken');
      const response = await fetch('/api/budget', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: parseFloat(budgetAmount),
          month,
          year,
        }),
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to set budget');
      setBudgetAmount('');
      fetchData();
    } catch (err) {
      setError('Failed to set budget');
      console.error(err);
    } finally {
      setSettingBudget(false);
    }
  };

  const handleResetBudget = async () => {
    const deleteExpenses = confirm(
      '⚠️ RESET BUDGET\n\n' +
      'Do you want to DELETE ALL EXPENSES for this month along with resetting the budget?\n\n' +
      '• Click OK to RESET BUDGET + DELETE ALL EXPENSES\n' +
      '• Click Cancel to only RESET BUDGET (keep expenses)\n\n' +
      'This action cannot be undone!'
    );

    const confirmReset = confirm(
      deleteExpenses
        ? '🗑️ FINAL CONFIRMATION\n\nYou are about to:\n• Reset budget to ₹0\n• DELETE ALL expenses for this month\n\nThis will permanently delete all your expense data!\n\nAre you absolutely sure?'
        : '⚠️ CONFIRMATION\n\nYou are about to reset your budget to ₹0.\n\nYour expenses will remain but the budget will be cleared.\n\nContinue?'
    );

    if (!confirmReset) {
      return;
    }

    setResettingBudget(true);

    try {
      const token = await storage.getItem('accessToken');
      const response = await fetch('/api/budget/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          month,
          year,
          deleteExpenses,
        }),
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to reset budget');

      const data = await response.json();

      if (deleteExpenses && data.deletedExpenses > 0) {
        alert(`✅ Success!\n\nBudget reset to ₹0\n${data.deletedExpenses} expense(s) deleted`);
      } else {
        alert('✅ Budget reset to ₹0');
      }

      setBudgetAmount('');

      // Trigger parent component refresh to reload all data
      if (onResetSuccess) {
        onResetSuccess();
      } else {
        // Fallback: just fetch data if no callback provided
        fetchData();
      }
    } catch (err) {
      setError('Failed to reset budget');
      console.error(err);
    } finally {
      setResettingBudget(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-600 dark:text-gray-400">Loading...</div>;
  }

  if (!data) {
    return <div className="text-center py-8 text-red-600 dark:text-red-400">{error}</div>;
  }

  const { summary, categoryBreakdown, expenses } = data;
  const percentageSpent = summary.budgetAmount
    ? Math.round((summary.totalSpent / summary.budgetAmount) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header with Theme Toggle */}
      <div className="flex justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        </div>
        <ThemeToggle />
      </div>

      {/* Month/Year Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Select Period</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Month</label>
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-base font-medium min-h-[48px] appearance-none cursor-pointer transition-all duration-200"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundPosition: 'right 1rem center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: '1.5em 1.5em',
              }}
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(2024, i).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Year</label>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-base font-medium min-h-[48px] appearance-none cursor-pointer transition-all duration-200"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundPosition: 'right 1rem center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: '1.5em 1.5em',
              }}
            >
              {Array.from({ length: 5 }, (_, i) => (
                <option key={i} value={new Date().getFullYear() - 2 + i}>
                  {new Date().getFullYear() - 2 + i}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* AI Alerts */}
      <AIAlerts month={month} year={year} />

      {/* Budget Summary Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Budget Summary</h2>
        </div>

        {summary.budgetAmount ? (
          <>
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Monthly Progress</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                  {percentageSpent}%
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    {formatINR(summary.totalSpent)}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    of {formatINR(summary.budgetAmount)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                  <div
                    className={`h-4 rounded-full transition-all duration-500 ${
                      percentageSpent > 100
                        ? 'bg-gradient-to-r from-red-500 to-red-600'
                        : percentageSpent > 80
                        ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                        : 'bg-gradient-to-r from-emerald-500 to-green-600'
                    }`}
                    style={{ width: `${Math.min(percentageSpent, 100)}%` }}
                  />
                </div>
                <p className="text-sm font-medium text-center">
                  {summary.remaining !== null && summary.remaining >= 0 ? (
                    <span className="text-emerald-600 dark:text-emerald-400">
                      {formatINR(summary.remaining)} remaining
                    </span>
                  ) : (
                    <span className="text-red-600 dark:text-red-400">
                      {formatINR(Math.abs(summary.remaining || 0))} over budget
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <form onSubmit={handleSetBudget} className="space-y-3">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    value={budgetAmount}
                    onChange={(e) => setBudgetAmount(e.target.value)}
                    placeholder="Update budget amount"
                    className="w-full pl-8 pr-4 py-4 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg font-medium placeholder-gray-400 transition-all duration-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={settingBudget || !budgetAmount}
                  className="w-full px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-lg font-semibold transition-all duration-200 min-h-[56px] flex items-center justify-center gap-3 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {settingBudget ? (
                    <>
                      <svg className="animate-spin w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Updating...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Update Budget
                    </>
                  )}
                </button>
              </form>

              <button
                type="button"
                onClick={handleResetBudget}
                disabled={resettingBudget}
                className="w-full px-6 py-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl text-lg font-semibold transition-all duration-200 min-h-[56px] flex items-center justify-center gap-3 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                title="Reset budget and optionally delete all expenses for this month"
              >
                {resettingBudget ? (
                  <>
                    <svg className="animate-spin w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Resetting...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Reset Budget & Clear Data
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          <>
            {aiRecommendation && !loadingRecommendation && (
              <div className="mb-4 p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg">
                <div className="flex items-start space-x-2">
                  <span className="text-lg">🤖</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-indigo-900 dark:text-indigo-100 mb-1">
                      AI Recommendation: {formatINR(aiRecommendation.suggestedAmount)}
                    </p>
                    <p className="text-xs text-indigo-700 dark:text-indigo-300">
                      {aiRecommendation.reasoning}
                    </p>
                    <button
                      type="button"
                      onClick={() => setBudgetAmount(String(aiRecommendation.suggestedAmount))}
                      className="mt-2 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-lg transition"
                    >
                      Use This Amount
                    </button>
                  </div>
                </div>
              </div>
            )}
            {loadingRecommendation && (
              <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  Getting AI recommendation...
                </span>
              </div>
            )}
            <form onSubmit={handleSetBudget} className="flex flex-col sm:flex-row gap-2">
              <input
                type="number"
                step="0.01"
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(e.target.value)}
                placeholder="Set monthly budget"
                className="flex-1 px-3 py-2.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-base min-h-[44px] sm:min-h-auto"
                required
              />
              <button
                type="submit"
                disabled={settingBudget}
                className="px-4 py-2.5 sm:py-2 bg-indigo-600 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-indigo-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 min-h-[44px] sm:min-h-auto"
              >
                Set
              </button>
            </form>
          </>
        )}
      </div>

      {/* AI Insights */}
      <AIInsights />

      {/* Category Breakdown */}
      {Object.keys(categoryBreakdown).length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 md:p-6">
          <h3 className="text-lg sm:text-lg font-bold text-gray-900 dark:text-white mb-4">By Category</h3>
          <div className="space-y-3">
            {Object.entries(categoryBreakdown)
              .sort(([, a], [, b]) => b - a)
              .map(([category, amount]) => (
                <div key={category} className="flex justify-between items-center gap-2">
                  <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 truncate">{category}</span>
                  <span className="font-semibold text-xs sm:text-sm text-gray-900 dark:text-white whitespace-nowrap">{formatINR(amount)}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Recent Expenses */}
      {expenses.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 md:p-6">
          <h3 className="text-lg sm:text-lg font-bold text-gray-900 dark:text-white mb-4">Recent Expenses</h3>
          <div className="space-y-3">
            {expenses.slice(0, 5).map((exp) => (
              <div key={exp.id} className="flex justify-between items-start gap-2 py-2 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-xs sm:text-sm text-gray-900 dark:text-white truncate">{exp.category}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {new Date(exp.date).toLocaleDateString()}
                  </p>
                </div>
                <span className="font-semibold text-xs sm:text-sm text-gray-900 dark:text-white whitespace-nowrap">{formatINR(exp.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

