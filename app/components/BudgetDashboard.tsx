'use client';

import { useEffect, useState, useRef } from 'react';
import { formatINR } from '@/lib/currency';
import ThemeToggle from './ThemeToggle';
import AIInsights from './AIInsights';
import AIAlerts from './AIAlerts';
import AppleFitnessRings from './AppleFitnessRings';
import BudgetTabs from './BudgetTabs';
import TodaySpending from './TodaySpending';
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
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-12 bg-secondary rounded-xl w-3/4" />
        <div className="h-32 bg-secondary rounded-2xl" />
        <div className="h-48 bg-secondary rounded-2xl" />
        <div className="h-24 bg-secondary rounded-2xl" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-8 text-apple-red font-medium">{error}</div>
    );
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
          <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-[10px] flex items-center justify-center shrink-0 ${
            budgetType === 'family'
              ? 'bg-apple-purple/15'
              : 'bg-apple-blue/15'
          }`}>
            <svg className={`w-4 h-4 sm:w-5 sm:h-5 ${budgetType === 'family' ? 'text-apple-purple' : 'text-apple-blue'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {budgetType === 'family' ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              )}
            </svg>
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">Dashboard</h1>
            <p className="text-xs text-muted-foreground capitalize">{budgetType} Budget</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Export Button with Dropdown */}
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={exporting}
              className="press-effect p-2.5 sm:px-3 sm:py-2 rounded-[10px] text-sm font-medium transition-all duration-200 min-h-[40px] min-w-[40px] flex items-center justify-center gap-1.5 bg-secondary text-muted-foreground hover:text-foreground"
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
              <div className="absolute right-0 mt-2 w-52 glass rounded-xl shadow-apple-lg border-border/20 z-50 overflow-hidden animate-spring-in">
                <div className="p-3 border-b border-border/40">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Export {budgetType === 'family' ? 'Family' : 'Personal'} Data
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(year, month - 1).toLocaleString('default', { month: 'long' })} {year}
                  </p>
                </div>
                <div className="p-1.5 space-y-0.5">
                  <button
                    onClick={() => handleExport('csv')}
                    className="press-effect w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm rounded-lg hover:bg-secondary/60 transition-colors"
                  >
                    <span className="w-8 h-8 bg-apple-green/15 rounded-lg flex items-center justify-center text-base">📊</span>
                    <div>
                      <p className="font-medium text-foreground text-sm">CSV</p>
                      <p className="text-[10px] text-muted-foreground">Excel, Google Sheets</p>
                    </div>
                  </button>
                  <button
                    onClick={() => handleExport('json')}
                    className="press-effect w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm rounded-lg hover:bg-secondary/60 transition-colors"
                  >
                    <span className="w-8 h-8 bg-apple-blue/10 rounded-lg flex items-center justify-center text-base">📋</span>
                    <div>
                      <p className="font-medium text-foreground text-sm">JSON</p>
                      <p className="text-[10px] text-muted-foreground">For developers</p>
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

      {/* Month/Year Selector */}
      <div className="bg-card rounded-xl shadow-apple-sm overflow-hidden">
        <div className="flex items-center divide-x divide-border/40">
          <select
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value))}
            className="flex-1 px-4 py-3 bg-transparent border-0 text-sm font-medium text-foreground focus:ring-0 focus:outline-none cursor-pointer appearance-none"
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
            className="w-28 px-4 py-3 bg-transparent border-0 text-sm font-medium text-foreground focus:ring-0 focus:outline-none cursor-pointer appearance-none"
          >
            {Array.from({ length: 5 }, (_, i) => (
              <option key={i} value={new Date().getFullYear() - 2 + i}>
                {new Date().getFullYear() - 2 + i}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* AI Alerts - Budget Type Aware */}
      <AIAlerts month={month} year={year} budgetType={budgetType} />

      {/* Today's Spending Widget */}
      <TodaySpending expenses={expenses} budgetType={budgetType} />

      {/* Budget Summary Card */}
      <div className="bg-card rounded-2xl shadow-apple-md p-4 sm:p-6">
        <div className="flex items-center gap-2 sm:gap-3 mb-5">
          <div className="w-9 h-9 rounded-[10px] bg-apple-green/15 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-apple-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
          <h2 className="text-[17px] font-semibold text-foreground">Budget Summary</h2>
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

            {/* Stat grid: Spent / Budget / Remaining */}
            <div className="grid grid-cols-3 gap-2.5 mb-5">
              {[
                { label: 'Spent',     value: formatINR(summary.totalSpent),            color: 'text-apple-red'   },
                { label: 'Budget',    value: formatINR(summary.budgetAmount!),          color: 'text-foreground'  },
                { label: 'Left',      value: formatINR(Math.abs(summary.remaining || 0)), color: summary.remaining !== null && summary.remaining >= 0 ? 'text-apple-green' : 'text-apple-red' },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-secondary/60 rounded-xl p-3 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
                  <p className={`text-sm font-bold tabular-nums ${color}`}>{value}</p>
                </div>
              ))}
            </div>

            {/* Thin Apple-style progress bar */}
            <div className="mb-5">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-medium text-muted-foreground">Monthly Progress</span>
                <span className="text-xs font-bold text-foreground">{percentageSpent}%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all duration-700 ease-apple-ease ${
                    percentageSpent > 100
                      ? 'bg-apple-red'
                      : percentageSpent > 80
                      ? 'bg-apple-orange'
                      : 'bg-apple-green'
                  }`}
                  style={{ width: `${Math.min(percentageSpent, 100)}%` }}
                />
              </div>
              <p className="text-xs font-medium text-center mt-1.5">
                {summary.remaining !== null && summary.remaining >= 0 ? (
                  <span className="text-apple-green">{formatINR(summary.remaining)} remaining</span>
                ) : (
                  <span className="text-apple-red">{formatINR(Math.abs(summary.remaining || 0))} over budget</span>
                )}
              </p>
            </div>

            <div className="space-y-4 sm:space-y-5">
              {/* Quick Increase */}
              <div className="bg-apple-green/6 dark:bg-apple-green/10 rounded-xl p-4 border-l-[3px] border-apple-green">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-sm text-foreground">Quick Increase</span>
                  <button
                    type="button"
                    onClick={() => setShowIncreaseForm(!showIncreaseForm)}
                    className="press-effect text-xs font-semibold text-apple-green"
                  >
                    {showIncreaseForm ? 'Hide' : 'Show'}
                  </button>
                </div>

                {showIncreaseForm ? (
                  <form onSubmit={handleIncreaseBudget} className="space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="0.01"
                        value={increaseAmount}
                        onChange={(e) => setIncreaseAmount(e.target.value)}
                        placeholder="Amount to add"
                        className="flex-1 h-10 rounded-xl bg-card border-0 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-apple-green/40"
                      />
                      <button
                        type="submit"
                        disabled={settingBudget || !increaseAmount}
                        className="press-effect px-4 h-10 bg-apple-green text-white rounded-xl text-sm font-semibold shadow-apple-sm disabled:opacity-40"
                      >
                        Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[1000, 2000, 5000, 10000].map((amount) => (
                        <button key={amount} type="button" onClick={() => setIncreaseAmount(String(amount))}
                          className="press-effect px-3 py-1.5 text-xs font-semibold bg-apple-green/10 text-apple-green rounded-full">
                          +{formatINR(amount)}
                        </button>
                      ))}
                    </div>
                  </form>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {[1000, 2000, 5000, 10000].map((amount) => (
                      <button key={amount} type="button"
                        onClick={() => { setIncreaseAmount(String(amount)); setShowIncreaseForm(true); }}
                        className="press-effect px-3 py-1.5 text-xs font-semibold bg-apple-green/10 text-apple-green rounded-full">
                        +{formatINR(amount)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Set/Update Budget */}
              <form onSubmit={handleSetBudget} className="space-y-3">
                <input
                  type="number"
                  step="0.01"
                  value={budgetAmount}
                  onChange={(e) => setBudgetAmount(e.target.value)}
                  placeholder="Set new budget amount"
                  className="w-full h-[50px] rounded-xl bg-secondary/60 border-0 px-4 text-base font-medium focus:outline-none focus:ring-2 focus:ring-apple-blue/40"
                />
                <button
                  type="submit"
                  disabled={settingBudget || !budgetAmount}
                  className="press-effect w-full h-[50px] bg-apple-blue text-white rounded-xl text-[15px] font-semibold shadow-apple-md hover:bg-apple-blue/90 transition-colors disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center gap-2"
                >
                  {settingBudget ? (
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : null}
                  {settingBudget ? 'Updating…' : `Set ${budgetType === 'family' ? 'Family' : 'Personal'} Budget`}
                </button>
              </form>

              <button
                type="button"
                onClick={handleResetBudget}
                disabled={resettingBudget}
                className="press-effect w-full h-11 bg-apple-red/10 text-apple-red rounded-xl text-sm font-semibold hover:bg-apple-red/15 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {resettingBudget ? 'Resetting…' : 'Reset Budget & Clear Data'}
              </button>
            </div>
          </>
        ) : (
          <>
            {aiRecommendation && !loadingRecommendation && (
              <div className="mb-4 p-4 bg-apple-indigo/6 dark:bg-apple-indigo/10 border-l-[3px] border-apple-indigo rounded-xl animate-in">
                <div className="flex items-start gap-2">
                  <span>🤖</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground mb-1">
                      AI Recommendation: {formatINR(aiRecommendation.suggestedAmount)}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{aiRecommendation.reasoning}</p>
                    <button type="button" onClick={() => setBudgetAmount(String(aiRecommendation.suggestedAmount))}
                      className="press-effect mt-2 text-xs font-semibold text-apple-indigo">
                      Use This Amount
                    </button>
                  </div>
                </div>
              </div>
            )}
            {loadingRecommendation && (
              <div className="mb-4 p-3 bg-secondary rounded-xl flex items-center gap-2 animate-pulse">
                <div className="w-4 h-4 rounded-full border-2 border-apple-blue border-t-transparent animate-spin" />
                <span className="text-xs text-muted-foreground">Getting AI recommendation…</span>
              </div>
            )}
            <form onSubmit={handleSetBudget} className="space-y-3">
              <input
                type="number"
                step="0.01"
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(e.target.value)}
                placeholder="Set monthly budget"
                className="w-full h-[50px] rounded-xl bg-secondary/60 border-0 px-4 text-base font-medium focus:outline-none focus:ring-2 focus:ring-apple-blue/40"
                required
              />
              <button type="submit" disabled={settingBudget}
                className="press-effect w-full h-[50px] bg-apple-blue text-white rounded-xl font-semibold shadow-apple-md hover:bg-apple-blue/90 transition-colors disabled:opacity-40">
                {settingBudget ? 'Setting…' : 'Set Budget'}
              </button>
            </form>
          </>
        )}
      </div>

      {/* AI Insights - Budget Type Aware */}
      <AIInsights month={month} year={year} budgetType={budgetType} />

      {/* Category Breakdown — mini bar chart rows */}
      {Object.keys(categoryBreakdown).length > 0 && (() => {
        const sorted = Object.entries(categoryBreakdown).sort(([, a], [, b]) => b - a);
        const maxAmount = sorted[0]?.[1] ?? 1;
        return (
          <div className="bg-card rounded-xl shadow-apple-sm p-4">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-[8px] bg-apple-indigo/15 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-apple-indigo" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-[15px] font-semibold text-foreground">By Category</h3>
            </div>
            <div className="space-y-3">
              {sorted.map(([cat, amount]) => (
                <div key={cat} className="flex items-center gap-3">
                  <span className="text-sm text-foreground w-24 truncate">{cat}</span>
                  <div className="flex-1 bg-secondary rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full bg-apple-blue transition-all duration-700 ease-apple-ease"
                      style={{ width: `${(amount / maxAmount) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-foreground w-20 text-right">{formatINR(amount)}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Recent Expenses — icon bubble list */}
      {expenses.length > 0 && (
        <div className="bg-card rounded-xl shadow-apple-sm overflow-hidden">
          <div className="flex items-center gap-2.5 p-4 border-b border-border/40">
            <div className="w-8 h-8 rounded-[8px] bg-apple-orange/15 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-apple-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-[15px] font-semibold text-foreground">Recent Expenses</h3>
          </div>
          <div>
            {expenses.slice(0, 5).map((exp) => (
              <div key={exp.id} className="grouped-row flex items-center gap-3">
                <div className="w-9 h-9 rounded-[10px] bg-apple-blue/10 flex items-center justify-center shrink-0 text-base">
                  {exp.category === 'Food' ? '🍔' : exp.category === 'Transport' ? '🚇' : exp.category === 'Utilities' ? '💡' : exp.category === 'Entertainment' ? '🎬' : exp.category === 'Healthcare' ? '🏥' : exp.category === 'Shopping' ? '🛍️' : '📌'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{exp.category}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(exp.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                    {exp.note && ` · ${exp.note}`}
                  </p>
                </div>
                <span className="text-sm font-semibold tabular-nums text-foreground whitespace-nowrap">{formatINR(exp.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

