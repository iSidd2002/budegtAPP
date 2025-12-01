'use client';

interface BudgetTabsProps {
  activeTab: 'personal' | 'family';
  onTabChange: (tab: 'personal' | 'family') => void;
}

export default function BudgetTabs({ activeTab, onTabChange }: BudgetTabsProps) {
  return (
    <div className="w-full">
      {/* Tab Container - Mobile Optimized */}
      <div className="relative bg-gray-100 dark:bg-gray-800 rounded-xl p-1 sm:p-1.5">
        {/* Tab List */}
        <div className="relative flex">
          {/* Animated Background Slider */}
          <div
            className={`absolute top-1 bottom-1 w-[calc(50%-4px)] sm:w-[calc(50%-6px)] bg-white dark:bg-gray-700 rounded-lg shadow-sm transition-transform duration-300 ease-out ${
              activeTab === 'family' ? 'translate-x-[calc(100%+8px)] sm:translate-x-[calc(100%+12px)]' : 'translate-x-0'
            }`}
          />
          
          {/* Personal Tab - 48px minimum height for touch targets (iOS 44px + Android 48dp) */}
          <button
            onClick={() => onTabChange('personal')}
            className={`relative flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 min-h-[48px] sm:min-h-[52px] rounded-lg text-xs sm:text-sm font-semibold transition-colors duration-200 z-10 touch-manipulation ${
              activeTab === 'personal'
                ? 'text-gray-900 dark:text-white'
                : 'text-gray-500 dark:text-gray-400 active:text-gray-700 dark:active:text-gray-300'
            }`}
          >
            <svg 
              className={`w-4 h-4 sm:w-5 sm:h-5 transition-colors shrink-0 ${
                activeTab === 'personal' ? 'text-indigo-600 dark:text-indigo-400' : ''
              }`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="uppercase tracking-wide whitespace-nowrap">Personal</span>
            {activeTab === 'personal' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-10 sm:w-12 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
            )}
          </button>

          {/* Family Tab - 48px minimum height for touch targets */}
          <button
            onClick={() => onTabChange('family')}
            className={`relative flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 min-h-[48px] sm:min-h-[52px] rounded-lg text-xs sm:text-sm font-semibold transition-colors duration-200 z-10 touch-manipulation ${
              activeTab === 'family'
                ? 'text-gray-900 dark:text-white'
                : 'text-gray-500 dark:text-gray-400 active:text-gray-700 dark:active:text-gray-300'
            }`}
          >
            <svg 
              className={`w-4 h-4 sm:w-5 sm:h-5 transition-colors shrink-0 ${
                activeTab === 'family' ? 'text-purple-600 dark:text-purple-400' : ''
              }`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span className="uppercase tracking-wide whitespace-nowrap">Family</span>
            {activeTab === 'family' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-10 sm:w-12 h-0.5 bg-purple-600 dark:text-purple-400 rounded-full" />
            )}
          </button>
        </div>
      </div>
      
      {/* Tab Indicator Line */}
      <div className="mt-2 sm:mt-3 h-px bg-gray-200 dark:bg-gray-700 relative">
        <div 
          className={`absolute top-0 h-px w-1/2 transition-all duration-300 ease-out ${
            activeTab === 'personal' 
              ? 'left-0 bg-gradient-to-r from-indigo-500 to-indigo-600' 
              : 'left-1/2 bg-gradient-to-r from-purple-500 to-purple-600'
          }`}
        />
      </div>
    </div>
  );
}
