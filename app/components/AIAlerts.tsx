'use client';

import { useState, useEffect } from 'react';

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
      const token = localStorage.getItem('accessToken');
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

  if (loading) {
    return null; // Don't show anything while loading
  }

  if (alerts.length === 0) {
    return null; // Don't show if no alerts
  }

  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-lg shadow p-4 sm:p-6 border-l-4 border-amber-500">
      <div className="flex items-center space-x-2 mb-3">
        <span className="text-2xl">⚠️</span>
        <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
          Smart Alerts
        </h3>
      </div>

      <ul className="space-y-2">
        {alerts.map((alert, index) => (
          <li
            key={index}
            className="flex items-start space-x-2 text-sm text-gray-700 dark:text-gray-300"
          >
            <span className="text-amber-600 dark:text-amber-400 mt-0.5">
              {alert.toLowerCase().includes('warning') || alert.toLowerCase().includes('alert') ? '🚨' : '💡'}
            </span>
            <span>{alert}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

