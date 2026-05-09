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
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        }
      );

      if (!response.ok) throw new Error('Failed to fetch insights');

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

  const accentColor = budgetType === 'family' ? 'apple-purple' : 'apple-indigo';

  const Header = () => (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2.5">
        <div className={`w-9 h-9 rounded-[10px] bg-${accentColor}/15 flex items-center justify-center shrink-0`}>
          <span className="text-base">✨</span>
        </div>
        <div>
          <h3 className="text-[15px] font-semibold text-foreground">Smart Insights</h3>
          <p className="text-[11px] text-muted-foreground">
            {budgetType === 'family' ? 'Family' : 'Personal'} Analysis
          </p>
        </div>
      </div>
      <button
        onClick={fetchInsights}
        className="press-effect text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        title="Refresh"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
    </div>
  );

  if (loading) {
    return (
      <div className="bg-card rounded-2xl shadow-apple-sm p-5">
        <Header />
        <div className="flex items-center gap-2 py-4 text-muted-foreground text-sm">
          <svg className="animate-spin h-4 w-4 text-apple-indigo" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Analyzing {budgetType} spending patterns…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card rounded-2xl shadow-apple-sm p-5">
        <Header />
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{error}</p>
          <button onClick={fetchInsights}
            className="press-effect text-xs font-semibold text-apple-blue">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (insights.length === 0) return null;

  return (
    <div className="bg-card rounded-2xl shadow-apple-sm p-5 animate-in">
      <Header />
      <div className="space-y-2.5">
        {insights.map((insight, index) => (
          <div
            key={index}
            className={`p-3.5 rounded-xl text-sm leading-relaxed border-l-[3px] ${
              budgetType === 'family'
                ? 'bg-apple-purple/6 dark:bg-apple-purple/10 border-apple-purple text-foreground'
                : 'bg-apple-indigo/6 dark:bg-apple-indigo/10 border-apple-indigo text-foreground'
            }`}
          >
            {insight}
          </div>
        ))}
      </div>
    </div>
  );
}
