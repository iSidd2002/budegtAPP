'use client';

import { useState, useEffect, useCallback } from 'react';
import { storage } from '@/lib/storage';

interface AIInsightsProps {
  month?: number;
  year?: number;
  budgetType?: 'personal' | 'family';
}

export default function AIInsights({
  month = new Date().getMonth() + 1,
  year = new Date().getFullYear(),
  budgetType = 'personal'
}: AIInsightsProps) {
  const [insights, setInsights] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const token = await storage.getItem('accessToken');
      if (!token) {
        setError('Not authenticated');
        return;
      }

      const response = await fetch(
        `/api/ai/insights?month=${month}&year=${year}&budgetType=${budgetType}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch insights');
      }

      const data = await response.json();
      setInsights(data.insights || []);
    } catch (err) {
      console.error('Error fetching insights:', err);
      setError('Unable to load AI insights');
    } finally {
      setLoading(false);
    }
  }, [month, year, budgetType]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const budgetLabel = budgetType === 'family' ? '👨‍👩‍👧‍👦 Family' : '👤 Personal';
  const gradientClass = budgetType === 'family'
    ? 'from-purple-500 to-pink-600'
    : 'from-indigo-500 to-blue-600';

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className={`w-10 h-10 bg-gradient-to-br ${gradientClass} rounded-xl flex items-center justify-center`}>
            <span className="text-white text-lg">✨</span>
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">AI Insights</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">{budgetLabel}</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-6 text-gray-500 dark:text-gray-400 text-sm">
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Analyzing {budgetType} spending patterns...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 bg-gradient-to-br ${gradientClass} rounded-xl flex items-center justify-center`}>
              <span className="text-white text-lg">✨</span>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white">AI Insights</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">{budgetLabel}</p>
            </div>
          </div>
          <button
            onClick={fetchInsights}
            className="px-3 py-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">{error}</p>
      </div>
    );
  }

  if (insights.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5 sm:p-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 bg-gradient-to-br ${gradientClass} rounded-xl flex items-center justify-center`}>
            <span className="text-white text-lg">✨</span>
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">Smart Insights</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">{budgetLabel} Analysis</p>
          </div>
        </div>
        <button
          onClick={fetchInsights}
          className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg transition-colors flex items-center gap-1.5"
          title="Refresh"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      <div className="space-y-3">
        {insights.map((insight, index) => (
          <div
            key={index}
            className={`p-4 rounded-xl text-sm leading-relaxed ${
              budgetType === 'family'
                ? 'bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 text-purple-900 dark:text-purple-100'
                : 'bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 text-indigo-900 dark:text-indigo-100'
            }`}
          >
            {insight}
          </div>
        ))}
      </div>
    </div>
  );
}
