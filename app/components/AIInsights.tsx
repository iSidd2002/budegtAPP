'use client';

import { useState, useEffect } from 'react';
import { storage } from '@/lib/storage';

export default function AIInsights() {
  const [insights, setInsights] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    setLoading(true);
    setError('');

    try {
      const token = await storage.getItem('accessToken');
      if (!token) {
        setError('Not authenticated');
        return;
      }

      const response = await fetch('/api/ai/insights', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
      });

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
  };

  if (loading) {
    return (
      <div className="bg-card text-card-foreground rounded-xl border shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">✨</span>
          <h3 className="font-semibold tracking-tight">AI Insights</h3>
        </div>
        <div className="flex items-center justify-center py-4 text-muted-foreground text-sm">
          <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Analyzing financial patterns...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card text-card-foreground rounded-xl border shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">✨</span>
            <h3 className="font-semibold tracking-tight">AI Insights</h3>
          </div>
          <button 
            onClick={fetchInsights}
            className="text-xs text-primary hover:underline"
          >
            Retry
          </button>
        </div>
        <p className="text-sm text-muted-foreground mt-2">{error}</p>
      </div>
    );
  }

  if (insights.length === 0) return null;

  return (
    <div className="bg-card text-card-foreground rounded-xl border shadow-sm p-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">✨</span>
          <h3 className="font-semibold tracking-tight">Smart Insights</h3>
        </div>
        <button
          onClick={fetchInsights}
          className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
          title="Refresh"
        >
          Refresh
        </button>
      </div>

      <div className="space-y-3">
        {insights.map((insight, index) => (
          <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30 text-sm">
            <span className="text-primary mt-0.5">💡</span>
            <p className="leading-relaxed text-secondary-foreground/90">{insight}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
