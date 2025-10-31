'use client';

import { useState, useEffect } from 'react';

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
      const token = localStorage.getItem('accessToken');
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
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg shadow p-4 sm:p-6">
        <div className="flex items-center space-x-2 mb-4">
          <span className="text-2xl">🤖</span>
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
            AI Insights
          </h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <span className="ml-3 text-sm text-gray-600 dark:text-gray-400">
            Analyzing your spending...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg shadow p-4 sm:p-6">
        <div className="flex items-center space-x-2 mb-4">
          <span className="text-2xl">🤖</span>
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
            AI Insights
          </h3>
        </div>
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        <button
          onClick={fetchInsights}
          className="mt-3 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg transition"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg shadow p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">🤖</span>
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
            AI Insights
          </h3>
        </div>
        <button
          onClick={fetchInsights}
          className="text-xs sm:text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
          title="Refresh insights"
        >
          🔄 Refresh
        </button>
      </div>

      {insights.length === 0 ? (
        <p className="text-sm text-gray-600 dark:text-gray-400">
          No insights available yet. Add some expenses to get started!
        </p>
      ) : (
        <ul className="space-y-3">
          {insights.map((insight, index) => (
            <li
              key={index}
              className="flex items-start space-x-2 text-sm text-gray-700 dark:text-gray-300"
            >
              <span className="text-indigo-600 dark:text-indigo-400 mt-0.5">💡</span>
              <span>{insight}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

