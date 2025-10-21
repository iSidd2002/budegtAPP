'use client';

import { useEffect, useState } from 'react';

interface Insight {
  type: 'highest_category' | 'comparison' | 'recommendation';
  title: string;
  description: string;
  actionable: boolean;
}

interface InsightsData {
  insights: Insight[];
  summary?: {
    budget: number;
    spent: number;
    remaining: number;
    percentage: string;
    expenseCount: number;
  };
}

interface AIInsightsProps {
  month?: number;
  year?: number;
}

export default function AIInsights({ month, year }: AIInsightsProps) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchInsights();
  }, [month, year]);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams();
      if (month) params.append('month', String(month));
      if (year) params.append('year', String(year));

      const response = await fetch(`/api/ai/insights?${params}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch insights');
      }

      const data: InsightsData = await response.json();
      setInsights(data.insights || []);
    } catch (err) {
      console.error('Error fetching insights:', err);
      setError('Could not load AI insights');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6">
        <div className="flex items-center space-x-2">
          <div className="animate-spin h-5 w-5 text-indigo-600"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading AI insights...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6">
        <p className="text-sm text-gray-600 dark:text-gray-400">{error}</p>
      </div>
    );
  }

  if (insights.length === 0) {
    return null;
  }

  const getIconForType = (type: string) => {
    switch (type) {
      case 'highest_category':
        return '📊';
      case 'comparison':
        return '📈';
      case 'recommendation':
        return '💡';
      default:
        return '🤖';
    }
  };

  const getColorClasses = (type: string) => {
    switch (type) {
      case 'highest_category':
        return 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-300';
      case 'comparison':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-300';
      case 'recommendation':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-900 dark:text-green-300';
      default:
        return 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-300';
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
        <span>🤖 AI Insights</span>
      </h3>

      {insights.map((insight, index) => (
        <div
          key={index}
          className={`border rounded-lg p-4 ${getColorClasses(insight.type)}`}
        >
          <div className="flex items-start space-x-3">
            <span className="text-xl flex-shrink-0">{getIconForType(insight.type)}</span>
            <div className="flex-1">
              <h4 className="font-semibold text-sm mb-1">{insight.title}</h4>
              <p className="text-sm opacity-90">{insight.description}</p>
              {insight.actionable && (
                <p className="text-xs mt-2 opacity-75 italic">💬 Actionable insight</p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

