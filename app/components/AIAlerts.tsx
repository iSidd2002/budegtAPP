'use client';

import { useState, useEffect, useCallback } from 'react';
import { storage } from '@/lib/storage';

interface AIAlertsProps {
  month: number;
  year: number;
  budgetType?: 'personal' | 'family';
}

export default function AIAlerts({ month, year, budgetType = 'personal' }: AIAlertsProps) {
  const [alerts, setAlerts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    setError(false);

    try {
      const token = await storage.getItem('accessToken');
      if (!token) return;

      const response = await fetch(
        `/api/ai/alerts?month=${month}&year=${year}&budgetType=${budgetType}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          credentials: 'include',
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAlerts(data.alerts || []);
      } else {
        setError(true);
      }
    } catch (err) {
      console.error('Error fetching alerts:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [month, year, budgetType]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 animate-pulse">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 bg-amber-200 dark:bg-amber-700 rounded-full"></div>
          <div className="h-4 w-32 bg-amber-200 dark:bg-amber-700 rounded"></div>
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-amber-200 dark:bg-amber-700 rounded w-full"></div>
          <div className="h-3 bg-amber-200 dark:bg-amber-700 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (error || alerts.length === 0) {
    return null;
  }

  // Determine the alert theme based on content
  const hasWarning = alerts.some(a => a.includes('⚠️') || a.includes('🚨') || a.toLowerCase().includes('warning'));
  const hasCritical = alerts.some(a => a.includes('🚨') || a.toLowerCase().includes('critical') || a.toLowerCase().includes('over budget'));
  const isPositive = alerts.some(a => a.includes('✅') || a.includes('👍') || a.toLowerCase().includes('great') || a.toLowerCase().includes('good'));

  const bgClass = hasCritical
    ? 'bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/40 dark:to-orange-950/30 border-red-300 dark:border-red-800'
    : hasWarning
    ? 'bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 border-amber-200 dark:border-amber-800'
    : isPositive
    ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-800'
    : 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800';

  const textClass = hasCritical
    ? 'text-red-900 dark:text-red-100'
    : hasWarning
    ? 'text-amber-900 dark:text-amber-100'
    : isPositive
    ? 'text-green-900 dark:text-green-100'
    : 'text-blue-900 dark:text-blue-100';

  const headerIcon = hasCritical ? '🚨' : hasWarning ? '⚠️' : isPositive ? '✅' : '💡';
  const headerText = hasCritical
    ? 'Urgent Alert'
    : hasWarning
    ? 'Attention Needed'
    : isPositive
    ? 'Great Progress!'
    : 'Smart Tips';

  const budgetLabel = budgetType === 'family' ? '👨‍👩‍👧‍👦 Family' : '👤 Personal';

  return (
    <div className={`${bgClass} border rounded-2xl p-4 sm:p-5 animate-in fade-in slide-in-from-top-2 shadow-sm`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`flex items-center gap-2 ${textClass}`}>
          <span className="text-xl">{headerIcon}</span>
          <h3 className="font-bold text-sm tracking-tight uppercase">{headerText}</h3>
        </div>
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-white/50 dark:bg-gray-800/50 px-2 py-1 rounded-full">
          {budgetLabel}
        </span>
      </div>

      <ul className="space-y-3">
        {alerts.map((alert, index) => (
          <li
            key={index}
            className={`flex items-start gap-3 text-sm ${textClass.replace('900', '800').replace('100', '200/90')} bg-white/40 dark:bg-gray-900/20 rounded-xl p-3`}
          >
            <span className="leading-relaxed">{alert}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={fetchAlerts}
        className="mt-4 text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center gap-1 transition-colors"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Refresh
      </button>
    </div>
  );
}
