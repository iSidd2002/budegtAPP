'use client';

import { useEffect, useState } from 'react';
import { formatINR, formatCompactINR } from '@/lib/currency';

interface AppleFitnessRingsProps {
  // Budget Ring Data
  totalSpent: number;
  budgetAmount: number;

  // Time Ring Data
  month: number;
  year: number;

  // Category Ring Data (optional - shows top category spending)
  topCategorySpent?: number;
  topCategoryName?: string;
  topCategoryBudget?: number;
}

export default function AppleFitnessRings({
  totalSpent,
  budgetAmount,
  month,
  year,
  topCategorySpent = 0,
  topCategoryName = 'Food',
  topCategoryBudget
}: AppleFitnessRingsProps) {
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check for mobile on client side
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    // Trigger animation after mount
    const timer = setTimeout(() => setMounted(true), 150);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', checkMobile);
    };
  }, [totalSpent, budgetAmount, month, year]);

  // ====================
  // RING 1: BUDGET (Outer - Red/Pink like Move ring)
  // ====================
  const budgetPercentage = Math.min(Math.max((totalSpent / (budgetAmount || 1)) * 100, 0), 100);
  const isOverBudget = totalSpent > budgetAmount;

  // ====================
  // RING 2: TIME (Middle - Green like Exercise ring)
  // ====================
  const now = new Date();
  const daysInMonth = new Date(year, month, 0).getDate();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  let timePercentage = 0;
  if (year < currentYear || (year === currentYear && month < currentMonth)) {
    timePercentage = 100;
  } else if (year === currentYear && month === currentMonth) {
    timePercentage = (now.getDate() / daysInMonth) * 100;
  }

  // ====================
  // RING 3: CATEGORY (Inner - Blue like Stand ring)
  // ====================
  const categoryPercentage = topCategoryBudget
    ? Math.min(Math.max((topCategorySpent / topCategoryBudget) * 100, 0), 100)
    : (topCategorySpent / (budgetAmount * 0.3)) * 100; // Assume 30% of budget if no specific budget

  // ====================
  // SVG Configuration - Fixed viewBox, responsive container
  // ====================
  // Use a fixed viewBox size for consistent rendering
  const size = 320;
  const center = size / 2;
  const strokeWidth = 22;
  const ringGap = 8;

  // Ring radii (from outer to inner) - Larger values for more prominent rings
  const radius1 = 135; // Budget (outer) - increased
  const radius2 = radius1 - strokeWidth - ringGap; // Time (middle)
  const radius3 = radius2 - strokeWidth - ringGap; // Category (inner)

  // Calculate circumferences
  const circumference1 = 2 * Math.PI * radius1;
  const circumference2 = 2 * Math.PI * radius2;
  const circumference3 = 2 * Math.PI * radius3;

  // Calculate stroke offsets for animation
  const offset1 = circumference1 - (budgetPercentage / 100) * circumference1;
  const offset2 = circumference2 - (timePercentage / 100) * circumference2;
  const offset3 = circumference3 - (categoryPercentage / 100) * circumference3;

  return (
    <div className="flex flex-col items-center justify-center py-4 sm:py-6 relative w-full overflow-visible">
      {/* Main Rings Container - Fixed aspect ratio with responsive max-width */}
      <div
        className="relative mx-auto"
        style={{
          width: isMobile ? '260px' : '300px',
          height: isMobile ? '260px' : '300px',
        }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${size} ${size}`}
          className="rotate-[-90deg]"
          style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.08))' }}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Budget Ring Gradient (Red/Pink - Apple Move) */}
            <linearGradient id="budgetGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FA114F" />
              <stop offset="50%" stopColor="#FF0844" />
              <stop offset="100%" stopColor="#FF4581" />
            </linearGradient>
            
            {/* Time Ring Gradient (Green - Apple Exercise) */}
            <linearGradient id="timeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#92FE9D" />
              <stop offset="50%" stopColor="#00C9FF" />
              <stop offset="100%" stopColor="#7DE7EB" />
            </linearGradient>

            {/* Category Ring Gradient (Blue/Cyan - Apple Stand) */}
            <linearGradient id="categoryGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4FACFE" />
              <stop offset="50%" stopColor="#00F2FE" />
              <stop offset="100%" stopColor="#43E6FC" />
            </linearGradient>

            {/* Glow Filter for depth */}
            <filter id="ringGlow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Shadow for 3D effect */}
            <filter id="innerShadow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
              <feOffset dx="0" dy="2" result="offsetblur"/>
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.3"/>
              </feComponentTransfer>
              <feMerge> 
                <feMergeNode/>
                <feMergeNode in="SourceGraphic"/> 
              </feMerge>
            </filter>
          </defs>

          {/* ==================== RING 1: BUDGET (Outer) ==================== */}
          {/* Background Track */}
          <circle
            cx={center}
            cy={center}
            r={radius1}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="text-gray-200/40 dark:text-gray-800/30"
            style={{ filter: 'url(#innerShadow)' }}
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
            className="transition-all duration-[1500ms] ease-out"
            style={{ 
              filter: 'url(#ringGlow)',
              opacity: mounted ? 1 : 0
            }}
          />

          {/* ==================== RING 2: TIME (Middle) ==================== */}
          {/* Background Track */}
          <circle
            cx={center}
            cy={center}
            r={radius2}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="text-gray-200/40 dark:text-gray-800/30"
            style={{ filter: 'url(#innerShadow)' }}
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
            className="transition-all duration-[1500ms] ease-out"
            style={{ 
              filter: 'url(#ringGlow)',
              transitionDelay: '150ms',
              opacity: mounted ? 1 : 0
            }}
          />

          {/* ==================== RING 3: CATEGORY (Inner) ==================== */}
          {/* Background Track */}
          <circle
            cx={center}
            cy={center}
            r={radius3}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="text-gray-200/40 dark:text-gray-800/30"
            style={{ filter: 'url(#innerShadow)' }}
          />
          {/* Progress Arc */}
          <circle
            cx={center}
            cy={center}
            r={radius3}
            stroke="url(#categoryGradient)"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference3}
            strokeDashoffset={mounted ? offset3 : circumference3}
            strokeLinecap="round"
            className="transition-all duration-[1500ms] ease-out"
            style={{ 
              filter: 'url(#ringGlow)',
              transitionDelay: '300ms',
              opacity: mounted ? 1 : 0
            }}
          />
        </svg>

        {/* Center Content - Remaining Budget - Positioned inside inner ring */}
        {(() => {
          const remainingAmount = Math.abs(budgetAmount - totalSpent);
          // Use compact format for large amounts to prevent overflow
          const displayAmount = remainingAmount >= 10000
            ? formatCompactINR(remainingAmount)
            : formatINR(remainingAmount);
          // Dynamic font sizing based on text length
          const textLength = displayAmount.length;
          let fontSize: number;
          if (textLength <= 6) {
            fontSize = isMobile ? 22 : 28;
          } else if (textLength <= 8) {
            fontSize = isMobile ? 18 : 24;
          } else if (textLength <= 10) {
            fontSize = isMobile ? 16 : 20;
          } else {
            fontSize = isMobile ? 14 : 17;
          }

          return (
            <div
              className="absolute flex flex-col items-center justify-center pointer-events-none z-10"
              style={{
                // Increased size to fit larger text
                width: isMobile ? '130px' : '150px',
                height: isMobile ? '110px' : '130px',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div className="flex flex-col items-center animate-in fade-in zoom-in duration-700 delay-500 text-center">
                <span
                  className="font-bold uppercase tracking-widest text-muted-foreground whitespace-nowrap"
                  style={{ fontSize: isMobile ? '9px' : '11px', marginBottom: isMobile ? '2px' : '4px' }}
                >
                  Remaining
                </span>
                <span
                  className={`font-bold tabular-nums tracking-tight whitespace-nowrap ${
                    (budgetAmount - totalSpent) < 0
                      ? 'text-[#FA114F] dark:text-[#FF4581]'
                      : 'text-foreground'
                  }`}
                  style={{ fontSize: `${fontSize}px`, lineHeight: 1.1 }}
                >
                  {displayAmount}
                </span>
                {isOverBudget && (
                  <span
                    className="font-bold uppercase tracking-wider text-[#FA114F] dark:text-[#FF4581] animate-pulse whitespace-nowrap"
                    style={{ fontSize: isMobile ? '8px' : '10px', marginTop: isMobile ? '2px' : '4px' }}
                  >
                    Over Budget
                  </span>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Detailed Stats Legend - Apple Style - Mobile Optimized */}
      <div className="flex flex-col gap-3 sm:gap-4 mt-6 sm:mt-8 w-full px-1 sm:px-2">
        {/* Budget Ring Stats */}
        <div className="flex items-center justify-between group cursor-default hover:bg-accent/50 rounded-lg p-2.5 sm:p-3 transition-colors touch-manipulation">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="relative flex items-center justify-center shrink-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-[#FA114F] to-[#FF4581] shadow-lg shadow-red-500/30"></div>
              <span className="absolute text-white text-[10px] sm:text-xs font-bold">₹</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs sm:text-sm font-semibold text-foreground">Budget</span>
              <span className="text-[10px] sm:text-xs text-muted-foreground truncate">
                {formatINR(totalSpent)} of {formatINR(budgetAmount)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-lg sm:text-xl font-bold tabular-nums text-foreground">
              {Math.round(budgetPercentage)}%
            </span>
          </div>
        </div>

        {/* Time Ring Stats */}
        <div className="flex items-center justify-between group cursor-default hover:bg-accent/50 rounded-lg p-2.5 sm:p-3 transition-colors touch-manipulation">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="relative flex items-center justify-center shrink-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-[#92FE9D] via-[#00C9FF] to-[#7DE7EB] shadow-lg shadow-cyan-500/30"></div>
              <span className="absolute text-[10px] sm:text-xs font-bold">📅</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs sm:text-sm font-semibold text-foreground">Month Progress</span>
              <span className="text-[10px] sm:text-xs text-muted-foreground truncate">
                Day {year === currentYear && month === currentMonth ? now.getDate() : daysInMonth} of {daysInMonth}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-lg sm:text-xl font-bold tabular-nums text-foreground">
              {Math.round(timePercentage)}%
            </span>
          </div>
        </div>

        {/* Category Ring Stats */}
        <div className="flex items-center justify-between group cursor-default hover:bg-accent/50 rounded-lg p-2.5 sm:p-3 transition-colors touch-manipulation">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="relative flex items-center justify-center shrink-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-[#4FACFE] to-[#43E6FC] shadow-lg shadow-blue-500/30"></div>
              <span className="absolute text-[10px] sm:text-xs font-bold">🏷️</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs sm:text-sm font-semibold text-foreground">Top Category</span>
              <span className="text-[10px] sm:text-xs text-muted-foreground truncate">
                {topCategoryName}: {formatINR(topCategorySpent)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-lg sm:text-xl font-bold tabular-nums text-foreground">
              {Math.round(categoryPercentage)}%
            </span>
          </div>
        </div>
      </div>

      {/* Achievement Badge (if all rings complete) - Mobile Optimized */}
      {budgetPercentage >= 100 && timePercentage >= 100 && categoryPercentage >= 100 && (
        <div className="mt-4 sm:mt-6 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 text-white rounded-full shadow-xl animate-in bounce-in">
          <div className="flex items-center gap-2 justify-center">
            <span className="text-xl sm:text-2xl">🏆</span>
            <span className="font-bold text-xs sm:text-sm">All Rings Completed!</span>
          </div>
        </div>
      )}
    </div>
  );
}

