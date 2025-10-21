'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AddExpenseForm from '../components/AddExpenseForm';
import BudgetDashboard from '../components/BudgetDashboard';

// Disable static generation for this page
export const dynamic = 'force-dynamic';

export default function Dashboard() {
  const router = useRouter();
  const [refreshKey, setRefreshKey] = useState(0);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/');
    }
  }, [router]);

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
    } catch (err) {
      console.error(err);
    } finally {
      localStorage.removeItem('accessToken');
      router.push('/');
    }
  };

  const handleExport = async (format: 'csv' | 'json') => {
    setExporting(true);
    try {
      const token = localStorage.getItem('accessToken');
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
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 shadow dark:shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Budget App</h1>
          <div className="flex gap-2 items-center">
            <button
              onClick={() => handleExport('csv')}
              disabled={exporting}
              className="px-3 py-2 text-sm bg-green-600 hover:bg-green-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 text-white rounded-lg transition"
            >
              Export CSV
            </button>
            <button
              onClick={() => handleExport('json')}
              disabled={exporting}
              className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 text-white rounded-lg transition"
            >
              Export JSON
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Add Expense */}
          <div className="lg:col-span-1">
            <AddExpenseForm onSuccess={() => setRefreshKey((k) => k + 1)} />
          </div>

          {/* Right Column: Dashboard */}
          <div className="lg:col-span-2">
            <BudgetDashboard key={refreshKey} />
          </div>
        </div>
      </main>
    </div>
  );
}

