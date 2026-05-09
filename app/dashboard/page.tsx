'use client';

import { useState } from 'react';
import { useAuth } from '@/app/components/AuthProvider';
import AddExpenseForm from '../components/AddExpenseForm';
import BudgetDashboard from '../components/BudgetDashboard';
import LoansManager from '../components/LoansManager';
import PWAInstallButton from '../components/PWAInstallButton';
import { storage } from '@/lib/storage';

export const dynamic = 'force-dynamic';

type MainTab = 'expenses' | 'loans';

export default function Dashboard() {
  const { logout } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [showExportSheet, setShowExportSheet] = useState(false);
  const [budgetType, setBudgetType] = useState<'personal' | 'family'>('personal');
  const [mainTab, setMainTab] = useState<MainTab>('expenses');

  const handleLogout = async () => {
    await logout();
  };

  const handleExport = async (format: 'csv' | 'json') => {
    setExporting(true);
    setShowExportSheet(false);
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
      {/* Header — frosted glass, accounts for iOS notch via pt-safe */}
      <header className="sticky top-0 z-50 w-full glass shadow-apple-sm border-b border-border/30">
        <div
          className="flex items-center justify-between px-4 md:px-6 max-w-7xl mx-auto"
          style={{
            height: 'calc(52px + env(safe-area-inset-top))',
            paddingTop: 'env(safe-area-inset-top)',
          }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-apple-blue to-apple-indigo flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-[17px] font-semibold tracking-tight text-foreground">Budget</span>
          </div>

          <div className="flex items-center gap-1">
            {/* Export — single button, opens bottom sheet on mobile */}
            <button
              onClick={() => setShowExportSheet(true)}
              disabled={exporting}
              className="press-effect touch-target rounded-[10px] text-muted-foreground hover:text-foreground disabled:opacity-40"
              title="Export"
            >
              {exporting ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              )}
            </button>

            <button
              onClick={handleLogout}
              className="press-effect touch-target rounded-[10px] text-apple-red"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* iOS Segmented Control — full width on mobile */}
      <div className="px-4 md:px-6 max-w-7xl mx-auto pt-4 pb-2">
        <div className="flex bg-neutral-100 dark:bg-neutral-900 rounded-[10px] p-[3px] w-full">
          {(['expenses', 'loans'] as MainTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setMainTab(tab)}
              className={`press-effect flex-1 py-2 rounded-[8px] text-sm font-semibold transition-all duration-200 ease-apple-ease ${
                mainTab === tab
                  ? 'bg-card shadow-apple-sm text-foreground'
                  : 'text-muted-foreground'
              }`}
            >
              {tab === 'expenses' ? '💰 Expenses & Budget' : '🤝 Loans'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content — bottom padding for iOS home indicator */}
      <main
        className="container py-4 sm:py-6 px-4 md:px-6 max-w-7xl mx-auto animate-in"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 24px)' }}
      >
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

      {/* Export bottom sheet (works great on mobile) */}
      {showExportSheet && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowExportSheet(false)}
          />
          <div
            className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-2xl shadow-apple-xl animate-spring-in"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}
          >
            <div className="w-10 h-1 bg-border rounded-full mx-auto mt-3 mb-4" />
            <div className="px-4 pb-2">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">Export Data</p>
              <div className="space-y-2">
                <button
                  onClick={() => handleExport('csv')}
                  className="press-effect w-full flex items-center gap-3 p-4 bg-secondary/60 rounded-xl text-left"
                >
                  <span className="w-10 h-10 bg-apple-green/15 rounded-xl flex items-center justify-center text-lg shrink-0">📊</span>
                  <div>
                    <p className="font-semibold text-foreground text-[15px]">Export CSV</p>
                    <p className="text-xs text-muted-foreground">Open in Excel or Google Sheets</p>
                  </div>
                </button>
                <button
                  onClick={() => handleExport('json')}
                  className="press-effect w-full flex items-center gap-3 p-4 bg-secondary/60 rounded-xl text-left"
                >
                  <span className="w-10 h-10 bg-apple-blue/10 rounded-xl flex items-center justify-center text-lg shrink-0">📋</span>
                  <div>
                    <p className="font-semibold text-foreground text-[15px]">Export JSON</p>
                    <p className="text-xs text-muted-foreground">For developers</p>
                  </div>
                </button>
              </div>
              <button
                onClick={() => setShowExportSheet(false)}
                className="press-effect w-full mt-3 py-3.5 rounded-xl bg-secondary text-muted-foreground font-semibold text-[15px]"
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
