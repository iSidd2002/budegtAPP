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

  // AuthProvider handles all auth logic and redirects
  // This component only renders when authenticated

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 shadow-sm dark:shadow-lg sticky top-0 z-50 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col space-y-4 sm:space-y-0 sm:flex-row sm:justify-between sm:items-center">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">💰 Budget App</h1>
            </div>

            {/* Action buttons - optimized for mobile */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-2">
              <div className="flex gap-2">
                <button
                  onClick={() => handleExport('csv')}
                  disabled={exporting}
                  className="flex-1 sm:flex-none px-4 py-3 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl transition-all duration-200 min-h-[48px] flex items-center justify-center gap-2 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {exporting ? 'Exporting...' : 'CSV'}
                </button>
                <button
                  onClick={() => handleExport('json')}
                  disabled={exporting}
                  className="flex-1 sm:flex-none px-4 py-3 text-sm font-medium bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl transition-all duration-200 min-h-[48px] flex items-center justify-center gap-2 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  {exporting ? 'Exporting...' : 'JSON'}
                </button>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-3 text-sm font-medium bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-xl transition-all duration-200 min-h-[48px] flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Mobile: Add Expense Form First */}
          <div className="lg:col-span-1 order-1 lg:order-1">
            <AddExpenseForm onSuccess={() => setRefreshKey((k) => k + 1)} />
          </div>

          {/* Mobile: Dashboard Second */}
          <div className="lg:col-span-2 order-2 lg:order-2">
            <BudgetDashboard
              key={refreshKey}
              onResetSuccess={() => setRefreshKey((k) => k + 1)}
            />
          </div>
        </div>
      </main>

      {/* PWA Install Button - Floating */}
      <PWAInstallButton />
    </div>
  );
}

