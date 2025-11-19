'use client';

import { useEffect, useState } from 'react';

interface RingProgressProps {
  progress: number;
  radius?: number;
  stroke?: number;
  colorStart?: string;
  colorEnd?: string;
  children?: React.ReactNode;
}

export default function RingProgress({
  progress,
  radius = 100,
  stroke = 15,
  colorStart = '#3b82f6',
  colorEnd = '#8b5cf6',
  children
}: RingProgressProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (animatedProgress / 100) * circumference;

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress(progress);
    }, 100);
    return () => clearTimeout(timer);
  }, [progress]);

  // Unique ID for gradient to allow multiple rings on same page
  const gradientId = `ring-gradient-${colorStart.replace('#', '')}-${colorEnd.replace('#', '')}`;

  return (
    <div 
      className="relative flex items-center justify-center"
      style={{ width: radius * 2, height: radius * 2 }}
    >
      <svg
        height={radius * 2}
        width={radius * 2}
        className="rotate-[-90deg] transition-all duration-500"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colorStart} />
            <stop offset="100%" stopColor={colorEnd} />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        
        {/* Background Track */}
        <circle
          stroke="currentColor"
          className="text-muted/20 dark:text-muted/10"
          strokeWidth={stroke}
          fill="transparent"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        
        {/* Progress Ring */}
        <circle
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeDasharray={circumference + ' ' + circumference}
          style={{ 
            strokeDashoffset,
            transition: 'stroke-dashoffset 1s ease-out',
            filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.1))'
          }}
          strokeLinecap="round"
          fill="transparent"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
      
      {/* Center Content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}
