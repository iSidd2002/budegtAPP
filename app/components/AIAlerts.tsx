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
          headers: { Authorization: `Bearer ${token}` },
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
      <div className="bg-card rounded-xl shadow-apple-sm p-4 animate-pulse">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-secondary rounded-[8px]" />
          <div className="h-4 w-32 bg-secondary rounded" />
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-secondary rounded w-full" />
          <div className="h-3 bg-secondary rounded w-3/4" />
        </div>
      </div>
    );
  }

  if (error || alerts.length === 0) return null;

  const hasCritical = alerts.some(a => a.includes('🚨') || a.toLowerCase().includes('critical') || a.toLowerCase().includes('over budget'));
  const hasWarning  = alerts.some(a => a.includes('⚠️') || a.toLowerCase().includes('warning'));
  const isPositive  = alerts.some(a => a.includes('✅') || a.includes('👍') || a.toLowerCase().includes('great') || a.toLowerCase().includes('good'));

  const severity = hasCritical ? 'critical' : hasWarning ? 'warning' : isPositive ? 'positive' : 'info';

  const severityConfig = {
    critical: { bg: 'bg-apple-red/8 dark:bg-apple-red/12',       border: 'border-apple-red',    icon: '🚨', label: 'Urgent Alert',     color: 'text-apple-red'    },
    warning:  { bg: 'bg-apple-orange/8 dark:bg-apple-orange/12',  border: 'border-apple-orange', icon: '⚠️', label: 'Attention Needed', color: 'text-apple-orange' },
    positive: { bg: 'bg-apple-green/8 dark:bg-apple-green/12',    border: 'border-apple-green',  icon: '✅', label: 'Great Progress!',   color: 'text-apple-green'  },
    info:     { bg: 'bg-apple-blue/8 dark:bg-apple-blue/10',      border: 'border-apple-blue',   icon: '💡', label: 'Smart Tips',        color: 'text-apple-blue'   },
  };

  const cfg = severityConfig[severity];

  return (
    <div className="bg-card rounded-xl shadow-apple-sm overflow-hidden animate-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0 ${cfg.bg} border-l-[3px] ${cfg.border}`}>
            <span className="text-sm">{cfg.icon}</span>
          </div>
          <h3 className="text-[15px] font-semibold text-foreground">{cfg.label}</h3>
        </div>
        <button
          onClick={fetchAlerts}
          className="press-effect text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Alert items as left-border callouts */}
      <div className="px-4 pb-4 space-y-2">
        {alerts.map((alert, index) => (
          <div
            key={index}
            className={`${cfg.bg} border-l-[3px] ${cfg.border} rounded-xl p-3.5 text-sm text-foreground leading-relaxed`}
          >
            {alert}
          </div>
        ))}
      </div>
    </div>
  );
}
