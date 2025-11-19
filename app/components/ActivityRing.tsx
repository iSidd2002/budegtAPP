'use client';

import React from 'react';

interface ActivityRingProps {
  progress: number; // 0 to 100+
  size?: number;
  strokeWidth?: number;
  color?: string; // CSS color class e.g. "text-primary"
  trackColor?: string; // CSS color class e.g. "text-muted"
  children?: React.ReactNode;
  animate?: boolean;
}

export default function ActivityRing({
  progress,
  size = 160,
  strokeWidth = 16,
  color = 'text-primary',
  trackColor = 'text-muted/20',
  children,
  animate = true,
}: ActivityRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  
  // Cap visual progress at 100% for the main ring to avoid confusion, 
  // or let it wrap if we wanted complex overlapping logic. 
  // For budget, seeing "full" is usually enough, but we'll cap visual stroke at 100.
  const normalizedProgress = Math.min(Math.max(progress, 0), 100);
  const offset = circumference - (normalizedProgress / 100) * circumference;

  return (
    <div 
      className="relative flex items-center justify-center" 
      style={{ width: size, height: size }}
    >
      {/* Background Glow for aesthetic feel */}
      <div 
        className={`absolute inset-0 rounded-full opacity-20 blur-xl transition-colors duration-500 ${color.replace('text-', 'bg-')}`} 
        style={{ transform: 'scale(0.8)' }}
      />

      {/* SVG Container - Rotated -90deg to start from top */}
      <svg
        className="transform -rotate-90 w-full h-full relative z-10"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Background Track */}
        <circle
          className={`stroke-current ${trackColor}`}
          strokeWidth={strokeWidth}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        
        {/* Progress Stroke */}
        <circle
          className={`stroke-current ${animate ? 'transition-all duration-1000 ease-out' : ''} ${color}`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
          }}
        />
      </svg>

      {/* Inner Content */}
      {children && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 text-center px-4">
          {children}
        </div>
      )}
    </div>
  );
}

