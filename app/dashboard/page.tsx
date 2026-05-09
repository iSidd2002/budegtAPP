'use client';

import { useState } from 'react';
import { useAuth } from '@/app/components/AuthProvider';
import AddExpenseForm from '../components/AddExpenseForm';
import BudgetDashboard from '../components/BudgetDashboard';
import LoansManager from '../components/LoansManager';
import PWAInstallButton from '../components/PWAInstallButton';
import { storage } from '@/lib/storage';

// Disable static generation for this page
export const dynamic = 'force-dynamic';

type MainTab = 'expenses' | 'loans';

export default function Dashboard() {
  const { logout } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [budgetType, setBudgetType] = useState<'personal' | 'family'>('personal');
  const [mainTab, setMainTab] = useState<MainTab>('expenses');

  const handleLogout = async () => {
    await logout();
  };

  const handleExport = async (format: 'csv' | 'json') => {
    setExporting(true);
    try {
      const token = await storage.getItem('accessToken');
      const response = await fetch(`/api/analytics/export?format=${format}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expenses-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert('Export failed');
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background font-sans antialiased">
      {/* Header — frosted glass macOS-style navbar */}
      <header className="sticky top-0 z-50 w-full glass shadow-apple-sm border-b border-border/30">
        <div className="container flex h-[52px] sm:h-[60px] items-center justify-between px-4 md:px-6 max-w-7xl mx-auto">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-apple-blue to-apple-indigo flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-[17px] font-semibold tracking-tight text-foreground">Budget</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex gap-1.5">
              <button
                onClick={() => handleExport('csv')}
                disabled={exporting}
                className="press-effect inline-flex items-center justify-center rounded-[10px] text-sm font-medium transition-colors border border-border/60 bg-card/60 hover:bg-card h-8 px-3 text-foreground disabled:opacity-40"
              >
                Export CSV
              </button>
              <button
                onClick={() => handleExport('json')}
                disabled={exporting}
                className="press-effect inline-flex items-center justify-center rounded-[10px] text-sm font-medium transition-colors border border-border/60 bg-card/60 hover:bg-card h-8 px-3 text-foreground disabled:opacity-40"
              >
                Export JSON
              </button>
            </div>

            <button
              onClick={handleLogout}
              className="press-effect inline-flex items-center justify-center rounded-[10px] text-sm font-medium transition-colors text-apple-red hover:bg-apple-red/10 h-8 px-3"
            >
              Sign Out
            </button>

            {/* Mobile export */}
            <button
              onClick={() => handleExport('csv')}
              disabled={exporting}
              className="press-effect sm:hidden inline-flex items-center justify-center rounded-[10px] text-sm border border-border/60 bg-card/60 h-8 w-8"
              title="Export CSV"
            >
              📄
            </button>
          </div>
        </div>
      </header>

      {/* iOS Segmented Control tab navigation */}
      <div className="container px-4 md:px-6 max-w-7xl mx-auto pt-4 pb-2">
        <div className="inline-flex bg-neutral-100 dark:bg-neutral-900 rounded-[10px] p-[3px]">
          {(['expenses', 'loans'] as MainTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setMainTab(tab)}
              className={`press-effect px-5 py-1.5 rounded-[8px] text-sm font-semibold transition-all duration-200 ease-apple-ease ${
                mainTab === tab
                  ? 'bg-card shadow-apple-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'expenses' ? '💰 Expenses & Budget' : '🤝 Loans'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="container py-4 sm:py-6 px-4 md:px-6 lg:py-6 max-w-7xl mx-auto animate-in">
        {mainTab === 'expenses' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
            <div className="lg:col-span-4 order-1">
              <div className="lg:sticky lg:top-[72px]">
                <AddExpenseForm
                  onSuccess={() => setRefreshKey((k) => k + 1)}
                  budgetType={budgetType}
                />
              </div>
            </div>

            <div className="lg:col-span-8 order-2">
              <BudgetDashboard
                key={`${refreshKey}-${budgetType}`}
                onResetSuccess={() => setRefreshKey((k) => k + 1)}
                budgetType={budgetType}
                onBudgetTypeChange={setBudgetType}
              />
            </div>
          </div>
        ) : (
          <LoansManager />
        )}
      </main>

      <PWAInstallButton />
    </div>
  );
}
