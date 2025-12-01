'use client';

import { useState } from 'react';
import { useAuth } from '@/app/components/AuthProvider';
import AddExpenseForm from '../components/AddExpenseForm';
import BudgetDashboard from '../components/BudgetDashboard';
import PWAInstallButton from '../components/PWAInstallButton';
import { storage } from '@/lib/storage';

// Disable static generation for this page
export const dynamic = 'force-dynamic';

export default function Dashboard() {
  const { logout } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [budgetType, setBudgetType] = useState<'personal' | 'family'>('personal');

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
      {/* Header - Mobile Optimized */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 sm:h-16 items-center justify-between px-4 sm:px-4 md:px-6 max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight">Budget App</span>
            <span className="hidden md:inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-foreground">
              Enterprise
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex gap-2">
              <button
                onClick={() => handleExport('csv')}
                disabled={exporting}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
              >
                Export CSV
              </button>
              <button
                onClick={() => handleExport('json')}
                disabled={exporting}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
              >
                Export JSON
              </button>
            </div>
            
            <button
              onClick={handleLogout}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 h-9 px-4 py-2"
            >
              Logout
            </button>
            
            {/* Mobile Export Menu (Simplified for now, could be a dropdown in future) */}
            <div className="sm:hidden flex gap-1">
               <button
                onClick={() => handleExport('csv')}
                disabled={exporting}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input h-9 w-9 p-0"
                title="Export CSV"
              >
                📄
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Mobile Optimized Margins (16px iPhone safe area, 16dp Android) */}
      <main className="container py-4 sm:py-6 px-4 sm:px-4 md:px-6 lg:py-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8">
          {/* Add Expense Form - 4 columns on large screens */}
          <div className="lg:col-span-4 order-1">
            <div className="lg:sticky lg:top-24">
              <AddExpenseForm 
                onSuccess={() => setRefreshKey((k) => k + 1)} 
                budgetType={budgetType}
              />
            </div>
          </div>

          {/* Dashboard - 8 columns on large screens */}
          <div className="lg:col-span-8 order-2">
            <BudgetDashboard
              key={`${refreshKey}-${budgetType}`}
              onResetSuccess={() => setRefreshKey((k) => k + 1)}
              budgetType={budgetType}
              onBudgetTypeChange={setBudgetType}
            />
          </div>
        </div>
      </main>

      {/* PWA Install Button */}
      <PWAInstallButton />
    </div>
  );
}
