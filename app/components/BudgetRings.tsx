'use client';

import { useEffect, useState } from 'react';
import { formatINR } from '@/lib/currency';

interface BudgetRingsProps {
  totalSpent: number;
  budgetAmount: number;
  month: number;
  year: number;
}

export default function BudgetRings({ totalSpent, budgetAmount, month, year }: BudgetRingsProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Trigger animation after mount
    setTimeout(() => setMounted(true), 100);
  }, []);

  // 1. Calculate Spending Progress
  // Cap visual progress at 100% for the ring itself, but we can show overage text
  const spendingPercentage = Math.min(Math.max((totalSpent / budgetAmount) * 100, 0), 100);

  // 2. Calculate Time Progress
  const now = new Date();
  const daysInMonth = new Date(year, month, 0).getDate();
  
  // If looking at past month, time is 100%. If future, 0%. If current, calculate day.
  let timePercentage = 0;
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  if (year < currentYear || (year === currentYear && month < currentMonth)) {
    timePercentage = 100;
  } else if (year === currentYear && month === currentMonth) {
    const currentDay = now.getDate();
    timePercentage = (currentDay / daysInMonth) * 100;
  }
  
  // SVG Config
  const size = 240;
  const center = size / 2;
  const strokeWidth = 20;
  const circleSpacing = 4; // Gap between rings

  // Ring 1: Budget (Outer)
  const radius1 = 90;
  const circumference1 = 2 * Math.PI * radius1;
  const offset1 = circumference1 - (spendingPercentage / 100) * circumference1;

  // Ring 2: Time (Inner)
  const radius2 = radius1 - strokeWidth - circleSpacing;
  const circumference2 = 2 * Math.PI * radius2;
  const offset2 = circumference2 - (timePercentage / 100) * circumference2;

  return (
    <div className="flex flex-col items-center justify-center py-4 relative">
      {/* The Rings Container */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="rotate-[-90deg]">
          {/* Definitions for Gradients and Glows */}
          <defs>
            {/* Budget Gradient (Red/Pink) */}
            <linearGradient id="budgetGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FA2256" /> {/* Red */}
              <stop offset="100%" stopColor="#E91E63" /> {/* Pink */}
            </linearGradient>
            
            {/* Time Gradient (Green/Mint) */}
            <linearGradient id="timeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#34D399" /> {/* Emerald */}
              <stop offset="100%" stopColor="#A7F3D0" /> {/* Mint */}
            </linearGradient>

            {/* Glow Filter */}
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            
            {/* Round Cap shadow for depth (optional, keeping simple for now) */}
          </defs>

          {/* --- RING 1: BUDGET --- */}
          {/* Background Track */}
          <circle
            cx={center}
            cy={center}
            r={radius1}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="text-gray-200 dark:text-gray-800/50"
          />
          {/* Progress Arc */}
          <circle
            cx={center}
            cy={center}
            r={radius1}
            stroke="url(#budgetGradient)"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference1}
            strokeDashoffset={mounted ? offset1 : circumference1}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out drop-shadow-lg"
            style={{ filter: 'url(#glow)' }}
          />

          {/* --- RING 2: TIME --- */}
          {/* Background Track */}
          <circle
            cx={center}
            cy={center}
            r={radius2}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="text-gray-200 dark:text-gray-800/50"
          />
          {/* Progress Arc */}
          <circle
            cx={center}
            cy={center}
            r={radius2}
            stroke="url(#timeGradient)"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference2}
            strokeDashoffset={mounted ? offset2 : circumference2}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out drop-shadow-lg delay-100"
            style={{ filter: 'url(#glow)' }}
          />
        </svg>

        {/* Center Text/Icons */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Remaining</span>
            <span className={`text-2xl font-bold tabular-nums tracking-tight ${
              (budgetAmount - totalSpent) < 0 ? 'text-[#FA2256]' : 'text-foreground'
            }`}>
              {formatINR(budgetAmount - totalSpent)}
            </span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-6 mt-6">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#FA2256] shadow-[0_0_8px_rgba(250,34,86,0.6)]"></div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-muted-foreground">Spent</span>
            <span className="text-sm font-bold">{Math.round(spendingPercentage)}%</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#34D399] shadow-[0_0_8px_rgba(52,211,153,0.6)]"></div>
          <div className="flex flex-col">
            <span className="text-xs font-bold text-muted-foreground">Time</span>
            <span className="text-sm font-bold">{Math.round(timePercentage)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

