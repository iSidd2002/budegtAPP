'use client';

import { useEffect, useState } from 'react';
import { formatINR } from '@/lib/currency';
import ThemeToggle from './ThemeToggle';
import AIInsights from './AIInsights';
import AIAlerts from './AIAlerts';

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

export default function BudgetDashboard() {
  const [data, setData] = useState<BudgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [budgetAmount, setBudgetAmount] = useState('');
  const [settingBudget, setSettingBudget] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState<{
    suggestedAmount: number;
    reasoning: string;
  } | null>(null);
  const [loadingRecommendation, setLoadingRecommendation] = useState(false);

  const fetchAIRecommendation = async () => {
    setLoadingRecommendation(true);
    try {
      const token = localStorage.getItem('accessToken');
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
      const token = localStorage.getItem('accessToken');
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
      const token = localStorage.getItem('accessToken');
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
    <div className="space-y-4 sm:space-y-6">
      {/* Header with Theme Toggle */}
      <div className="flex justify-between items-center gap-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <ThemeToggle />
      </div>

      {/* Month/Year Selector */}
      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
        <select
          value={month}
          onChange={(e) => setMonth(parseInt(e.target.value))}
          className="px-3 py-2.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-base sm:text-sm min-h-[44px] sm:min-h-auto"
        >
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {new Date(2024, i).toLocaleString('default', { month: 'long' })}
            </option>
          ))}
        </select>
        <select
          value={year}
          onChange={(e) => setYear(parseInt(e.target.value))}
          className="px-3 py-2.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-base sm:text-sm min-h-[44px] sm:min-h-auto"
        >
          {Array.from({ length: 5 }, (_, i) => (
            <option key={i} value={new Date().getFullYear() - 2 + i}>
              {new Date().getFullYear() - 2 + i}
            </option>
          ))}
        </select>
      </div>

      {/* AI Alerts */}
      <AIAlerts month={month} year={year} />

      {/* Budget Summary Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 md:p-6">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-4">Budget Summary</h2>

        {summary.budgetAmount ? (
          <>
            <div className="mb-4">
              <div className="flex justify-between mb-2 gap-2">
                <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">Spent</span>
                <span className="font-semibold text-xs sm:text-sm text-gray-900 dark:text-white text-right">
                  {formatINR(summary.totalSpent)} / {formatINR(summary.budgetAmount)}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${
                    percentageSpent > 100 ? 'bg-red-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(percentageSpent, 100)}%` }}
                />
              </div>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-2">
                {summary.remaining !== null && summary.remaining >= 0
                  ? `${formatINR(summary.remaining)} remaining`
                  : `${formatINR(Math.abs(summary.remaining || 0))} over budget`}
              </p>
            </div>

            <form onSubmit={handleSetBudget} className="flex flex-col sm:flex-row gap-2">
              <input
                type="number"
                step="0.01"
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(e.target.value)}
                placeholder="Update budget"
                className="flex-1 px-3 py-2.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-xs sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-base min-h-[44px] sm:min-h-auto"
              />
              <button
                type="submit"
                disabled={settingBudget || !budgetAmount}
                className="px-4 py-2.5 sm:py-2 bg-indigo-600 text-white rounded-lg text-xs sm:text-sm font-medium hover:bg-indigo-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 min-h-[44px] sm:min-h-auto"
              >
                Update
              </button>
            </form>
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

