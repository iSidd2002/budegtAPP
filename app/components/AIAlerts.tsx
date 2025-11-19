'use client';

import { useState, useEffect } from 'react';
import { storage } from '@/lib/storage';

interface AIAlertsProps {
  month: number;
  year: number;
}

export default function AIAlerts({ month, year }: AIAlertsProps) {
  const [alerts, setAlerts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
  }, [month, year]);

  const fetchAlerts = async () => {
    setLoading(true);

    try {
      const token = await storage.getItem('accessToken');
      if (!token) return;

      const response = await fetch(
        `/api/ai/alerts?month=${month}&year=${year}`,
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
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || alerts.length === 0) {
    return null;
  }

  return (
    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center gap-2 mb-3 text-amber-900 dark:text-amber-100">
        <span className="text-lg">⚠️</span>
        <h3 className="font-semibold text-sm tracking-tight uppercase">Attention Needed</h3>
      </div>

      <ul className="space-y-2">
        {alerts.map((alert, index) => (
          <li
            key={index}
            className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-200/90"
          >
            <span className="mt-0.5">•</span>
            <span className="leading-tight">{alert}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
