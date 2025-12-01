'use client';

import { useEffect, useState, useRef } from 'react';
import { formatINR } from '@/lib/currency';
import ThemeToggle from './ThemeToggle';
import AIInsights from './AIInsights';
import AIAlerts from './AIAlerts';
import AppleFitnessRings from './AppleFitnessRings';
import BudgetTabs from './BudgetTabs';
import { storage } from '@/lib/storage';

interface BudgetData {
  budget: { amount: number } | null;
  summary: {
    month: number;
    year: number;
    budgetType?: string;
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
    budgetType?: string;
  }>;
}

interface BudgetDashboardProps {
  onResetSuccess?: () => void;
  budgetType?: 'personal' | 'family';
  onBudgetTypeChange?: (type: 'personal' | 'family') => void;
}

export default function BudgetDashboard({ onResetSuccess, budgetType: externalBudgetType, onBudgetTypeChange }: BudgetDashboardProps = {}) {
  const [data, setData] = useState<BudgetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [budgetAmount, setBudgetAmount] = useState('');
  const [increaseAmount, setIncreaseAmount] = useState('');
  const [showIncreaseForm, setShowIncreaseForm] = useState(false);
  const [settingBudget, setSettingBudget] = useState(false);
  const [resettingBudget, setResettingBudget] = useState(false);
  const [budgetType, setBudgetType] = useState<'personal' | 'family'>(externalBudgetType || 'personal');
  const [aiRecommendation, setAiRecommendation] = useState<{
    suggestedAmount: number;
    reasoning: string;
  } | null>(null);
  const [loadingRecommendation, setLoadingRecommendation] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Sync external budgetType changes
  useEffect(() => {
    if (externalBudgetType && externalBudgetType !== budgetType) {
      setBudgetType(externalBudgetType);
    }
  }, [externalBudgetType]);

  // Close export menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };

    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportMenu]);

  const handleTabChange = (newType: 'personal' | 'family') => {
    setBudgetType(newType);
    if (onBudgetTypeChange) {
      onBudgetTypeChange(newType);
    }
  };

  const fetchAIRecommendation = async () => {
    setLoadingRecommendation(true);
    try {
      const token = await storage.getItem('accessToken');
      if (!token) return;

      const response = await fetch(
        `/api/ai/budget-recommendation?month=${month}&year=${year}&budgetType=${budgetType}`,
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
      setLoading(true);
      const token = await storage.getItem('accessToken');
      if (!token) return;

      const response = await fetch(
        `/api/budget?month=${month}&year=${year}&budgetType=${budgetType}`,
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
  }, [month, year, budgetType]);

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
          budgetType,
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

  const handleIncreaseBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data?.summary.budgetAmount || !increaseAmount) return;
    
    setSettingBudget(true);

    try {
      const token = await storage.getItem('accessToken');
      const newAmount = data.summary.budgetAmount + parseFloat(increaseAmount);
      
      const response = await fetch('/api/budget', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: newAmount,
          month,
          year,
          budgetType,
        }),
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to increase budget');
      setIncreaseAmount('');
      setShowIncreaseForm(false);
      fetchData();
    } catch (err) {
      setError('Failed to increase budget');
      console.error(err);
    } finally {
      setSettingBudget(false);
    }
  };

  const handleResetBudget = async () => {
    const budgetLabel = budgetType === 'family' ? 'FAMILY' : 'PERSONAL';
    const deleteExpenses = confirm(
      `⚠️ RESET ${budgetLabel} BUDGET\n\n` +
      `Do you want to DELETE ALL ${budgetLabel} EXPENSES for this month along with resetting the budget?\n\n` +
      '• Click OK to RESET BUDGET + DELETE ALL EXPENSES\n' +
      '• Click Cancel to only RESET BUDGET (keep expenses)\n\n' +
      'This action cannot be undone!'
    );

    const confirmReset = confirm(
      deleteExpenses
        ? `🗑️ FINAL CONFIRMATION\n\nYou are about to:\n• Reset ${budgetLabel.toLowerCase()} budget to ₹0\n• DELETE ALL ${budgetLabel.toLowerCase()} expenses for this month\n\nThis will permanently delete all your expense data!\n\nAre you absolutely sure?`
        : `⚠️ CONFIRMATION\n\nYou are about to reset your ${budgetLabel.toLowerCase()} budget to ₹0.\n\nYour expenses will remain but the budget will be cleared.\n\nContinue?`
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
          budgetType,
          deleteExpenses,
        }),
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to reset budget');

      const data = await response.json();

      if (deleteExpenses && data.deletedExpenses > 0) {
        alert(`✅ Success!\n\n${budgetLabel} budget reset to ₹0\n${data.deletedExpenses} expense(s) deleted`);
      } else {
        alert(`✅ ${budgetLabel} budget reset to ₹0`);
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

  // Export expenses handler
  const handleExport = async (format: 'csv' | 'json') => {
    setExporting(true);
    setShowExportMenu(false);

    try {
      const token = await storage.getItem('accessToken');
      if (!token) {
        setError('Not authenticated');
        return;
      }

      // Get date range for current month
      const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];

      const response = await fetch(
        `/api/analytics/export?format=${format}&budgetType=${budgetType}&month=${month}&year=${year}&startDate=${startDate}&endDate=${endDate}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Get the filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : `expenses-${budgetType}-${month}-${year}.${format}`;

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export error:', err);
      setError('Failed to export expenses');
    } finally {
      setExporting(false);
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

  // Calculate top category for Apple Fitness Rings
  const sortedCategories = Object.entries(categoryBreakdown).sort(([, a], [, b]) => b - a);
  const topCategoryName = sortedCategories.length > 0 ? sortedCategories[0][0] : 'None';
  const topCategorySpent = sortedCategories.length > 0 ? sortedCategories[0][1] : 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header with Theme Toggle and Export - Mobile Optimized */}
      <div className="flex justify-between items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ${
            budgetType === 'family'
              ? 'bg-gradient-to-br from-purple-500 to-pink-600'
              : 'bg-gradient-to-br from-blue-500 to-indigo-600'
          }`}>
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {budgetType === 'family' ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              )}
            </svg>
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white truncate">Dashboard</h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 capitalize">{budgetType} Budget</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Export Button with Dropdown */}
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={exporting}
              className={`p-2.5 sm:px-3 sm:py-2 rounded-xl text-sm font-medium transition-all duration-200 min-h-[44px] min-w-[44px] flex items-center justify-center gap-1.5 ${
                budgetType === 'family'
                  ? 'bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50'
                  : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50'
              }`}
              title={`Export ${budgetType} expenses`}
            >
              {exporting ? (
                <svg className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              )}
              <span className="hidden sm:inline">{exporting ? 'Exporting...' : 'Export'}</span>
            </button>

            {/* Export Dropdown Menu */}
            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    Export {budgetType === 'family' ? '👨‍👩‍👧‍👦 Family' : '👤 Personal'} Expenses
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                    {new Date(year, month - 1).toLocaleString('default', { month: 'long' })} {year}
                  </p>
                </div>
                <div className="p-1">
                  <button
                    onClick={() => handleExport('csv')}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <span className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                      <span className="text-sm">📊</span>
                    </span>
                    <div>
                      <p className="font-medium">CSV Format</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Excel, Google Sheets</p>
                    </div>
                  </button>
                  <button
                    onClick={() => handleExport('json')}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <span className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                      <span className="text-sm">📋</span>
                    </span>
                    <div>
                      <p className="font-medium">JSON Format</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">For developers</p>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
          <ThemeToggle />
        </div>
      </div>

      {/* Budget Type Tabs */}
      <BudgetTabs activeTab={budgetType} onTabChange={handleTabChange} />

      {/* Month/Year Selector - Mobile Optimized */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-3 sm:p-4 md:p-6">
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

      {/* AI Alerts - Budget Type Aware */}
      <AIAlerts month={month} year={year} budgetType={budgetType} />

      {/* Budget Summary Card - Mobile Optimized */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-3 sm:p-4 md:p-6">
        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Budget Summary</h2>
        </div>

        {summary.budgetAmount ? (
          <>
            {/* Apple Fitness Rings - Mobile Optimized */}
            <div className="mb-6 sm:mb-8">
              <AppleFitnessRings
                totalSpent={summary.totalSpent}
                budgetAmount={summary.budgetAmount}
                month={month}
                year={year}
                topCategorySpent={topCategorySpent}
                topCategoryName={topCategoryName}
                topCategoryBudget={summary.budgetAmount * 0.3}
              />
            </div>

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

            <div className="space-y-4 sm:space-y-5">
              {/* Quick Increase Budget - Mobile Optimized */}
              <div className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-xl p-3 sm:p-4 border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span className="font-semibold text-sm sm:text-base text-emerald-800 dark:text-emerald-200">Quick Increase</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowIncreaseForm(!showIncreaseForm)}
                    className="text-emerald-600 dark:text-emerald-400 active:text-emerald-700 dark:active:text-emerald-300 text-xs sm:text-sm font-medium min-h-[32px] sm:min-h-[36px] px-2 sm:px-3 touch-manipulation"
                  >
                    {showIncreaseForm ? 'Hide' : 'Show'}
                  </button>
                </div>
                
                {showIncreaseForm ? (
                  <form onSubmit={handleIncreaseBudget} className="space-y-3 sm:space-y-4">
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium text-sm sm:text-base">+₹</span>
                        <input
                          type="number"
                          step="0.01"
                          value={increaseAmount}
                          onChange={(e) => setIncreaseAmount(e.target.value)}
                          placeholder="Amount to add"
                          className="w-full pl-9 sm:pl-10 pr-3 py-3 sm:py-3.5 border border-emerald-300 dark:border-emerald-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-base font-medium placeholder-gray-400 transition-all duration-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={settingBudget || !increaseAmount}
                        className="px-4 sm:px-5 py-3 sm:py-3.5 bg-emerald-600 active:bg-emerald-700 text-white rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[48px] sm:min-h-[52px] touch-manipulation"
                      >
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-sm sm:text-base">Add</span>
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 sm:gap-3">
                      {[1000, 2000, 5000, 10000].map((amount) => (
                        <button
                          key={amount}
                          type="button"
                          onClick={() => setIncreaseAmount(String(amount))}
                          className="px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium bg-white dark:bg-gray-800 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 rounded-full active:bg-emerald-100 dark:active:bg-emerald-900/30 transition-colors min-h-[40px] sm:min-h-[44px] touch-manipulation"
                        >
                          +{formatINR(amount)}
                        </button>
                      ))}
                    </div>
                  </form>
                ) : (
                  <div className="flex flex-wrap gap-2 sm:gap-3">
                    {[1000, 2000, 5000, 10000].map((amount) => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => {
                          setIncreaseAmount(String(amount));
                          setShowIncreaseForm(true);
                        }}
                        className="px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium bg-white dark:bg-gray-800 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 rounded-full active:bg-emerald-100 dark:active:bg-emerald-900/30 transition-colors min-h-[40px] sm:min-h-[44px] touch-manipulation"
                      >
                        +{formatINR(amount)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Update Budget Form - Mobile Optimized */}
              <form onSubmit={handleSetBudget} className="space-y-3 sm:space-y-4">
                <div className="relative">
                  <span className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium text-sm sm:text-base">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    value={budgetAmount}
                    onChange={(e) => setBudgetAmount(e.target.value)}
                    placeholder="Set new budget amount"
                    className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-3 sm:py-4 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-base sm:text-lg font-medium placeholder-gray-400 transition-all duration-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={settingBudget || !budgetAmount}
                  className={`w-full px-4 sm:px-6 py-3 sm:py-4 text-white rounded-xl text-base sm:text-lg font-semibold transition-all duration-200 min-h-[48px] sm:min-h-[56px] flex items-center justify-center gap-2 sm:gap-3 shadow-lg active:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation ${
                    budgetType === 'family'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 active:from-purple-700 active:to-pink-700'
                      : 'bg-gradient-to-r from-indigo-600 to-purple-600 active:from-indigo-700 active:to-purple-700'
                  }`}
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
                      Set {budgetType === 'family' ? 'Family' : 'Personal'} Budget
                    </>
                  )}
                </button>
              </form>

              <button
                type="button"
                onClick={handleResetBudget}
                disabled={resettingBudget}
                className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-red-600 to-red-700 active:from-red-700 active:to-red-800 text-white rounded-xl text-base sm:text-lg font-semibold transition-all duration-200 min-h-[48px] sm:min-h-[56px] flex items-center justify-center gap-2 sm:gap-3 shadow-lg active:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
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

      {/* AI Insights - Budget Type Aware */}
      <AIInsights month={month} year={year} budgetType={budgetType} />

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

