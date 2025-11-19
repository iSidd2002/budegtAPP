'use client';

import { useEffect, useState } from 'react';
import { formatINR } from '@/lib/currency';

interface BudgetRingProps {
  spent: number;
  budget: number;
  size?: number;
  strokeWidth?: number;
}

export default function BudgetRing({ 
  spent, 
  budget, 
  size = 280, 
  strokeWidth = 24 
}: BudgetRingProps) {
  const [progress, setProgress] = useState(0);
  
  const percentage = Math.min(Math.max((spent / (budget || 1)) * 100, 0), 100);
  const isOverBudget = spent > budget;
  
  // Animation effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setProgress(percentage);
    }, 100);
    return () => clearTimeout(timer);
  }, [percentage]);

  // SVG calculations
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  // Colors based on status
  const getGradientColors = () => {
    if (isOverBudget) return ['#ef4444', '#b91c1c']; // Red for over budget
    if (percentage > 85) return ['#f59e0b', '#d97706']; // Amber for warning
    return ['#3b82f6', '#8b5cf6']; // Blue/Purple/Indigo default
  };

  const [startColor, endColor] = getGradientColors();

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Main SVG Ring */}
      <svg 
        width={size} 
        height={size} 
        viewBox={`0 0 ${size} ${size}`} 
        className="transform -rotate-90"
      >
        <defs>
          <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={startColor} />
            <stop offset="100%" stopColor={endColor} />
          </linearGradient>
          
          {/* Glow effect filter */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Background Track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-muted/20 dark:text-muted/10"
        />

        {/* Progress Ring */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="url(#ringGradient)"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeLinecap="round"
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
            transition: 'stroke-dashoffset 1.5s ease-out',
            filter: 'url(#glow)'
          }}
        />
        
        {/* Overlap cap for 100% complete rings to look seamless */}
        {progress >= 100 && !isOverBudget && (
           <circle
           cx={center}
           cy={center}
           r={radius}
           stroke={endColor}
           strokeWidth={strokeWidth}
           fill="transparent"
           strokeDasharray={`${strokeWidth / 10} ${circumference}`}
           strokeDashoffset={0}
           transform={`rotate(${(progress * 3.6)} ${center} ${center})`}
         />
        )}
      </svg>

      {/* Center Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in duration-700">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Spent
          </p>
          <h3 className="text-4xl font-bold tracking-tight tabular-nums text-foreground">
            {Math.round(progress)}%
          </h3>
          <p className="text-sm font-medium text-muted-foreground">
            of {formatINR(budget)}
          </p>
        </div>
      </div>
      
      {/* Over Budget Indicator */}
      {isOverBudget && (
        <div className="absolute -bottom-2 bg-destructive text-destructive-foreground text-xs font-bold px-3 py-1 rounded-full shadow-lg animate-in bounce-in">
          OVER BUDGET
        </div>
      )}
    </div>
  );
}

