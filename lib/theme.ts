/**
 * Theme management utilities for dark mode
 */

export type Theme = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = 'budget-app-theme';

/**
 * Get the current theme from localStorage or system preference
 */
export function getTheme(): Theme {
  if (typeof window === 'undefined') return 'system';
  
  const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
  if (stored) return stored;
  
  return 'system';
}

/**
 * Set the theme and update localStorage
 */
export function setTheme(theme: Theme): void {
  if (typeof window === 'undefined') return;
  
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  updateThemeClass(theme);
}

/**
 * Update the HTML element's class to reflect the theme
 */
export function updateThemeClass(theme: Theme): void {
  if (typeof window === 'undefined') return;
  
  const html = document.documentElement;
  
  if (theme === 'dark') {
    html.classList.add('dark');
  } else if (theme === 'light') {
    html.classList.remove('dark');
  } else {
    // System preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }
}

/**
 * Check if dark mode is currently active
 */
export function isDarkMode(): boolean {
  if (typeof window === 'undefined') return false;
  
  const theme = getTheme();
  
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  
  // System preference
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Initialize theme on app load
 */
export function initializeTheme(): void {
  if (typeof window === 'undefined') return;
  
  const theme = getTheme();
  updateThemeClass(theme);
  
  // Listen for system theme changes
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', () => {
    if (getTheme() === 'system') {
      updateThemeClass('system');
    }
  });
}

