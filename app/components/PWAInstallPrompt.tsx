'use client';

import { useEffect, useState, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Constants for dismissal period
const DISMISSAL_PERIOD_DAYS = 30;
const DISMISSAL_STORAGE_KEY = 'pwa-install-dismissed';
const MS_PER_DAY = 1000 * 60 * 60 * 24;

// Helper function to check if prompt should be shown based on dismissal date
function shouldShowPrompt(): boolean {
  try {
    const dismissed = localStorage.getItem(DISMISSAL_STORAGE_KEY);
    if (!dismissed) {
      return true; // Never dismissed, show prompt
    }

    const dismissedTime = parseInt(dismissed, 10);
    if (isNaN(dismissedTime)) {
      // Invalid stored value, clear it and show prompt
      localStorage.removeItem(DISMISSAL_STORAGE_KEY);
      return true;
    }

    const daysSinceDismissed = (Date.now() - dismissedTime) / MS_PER_DAY;

    // Show again after 30 days
    if (daysSinceDismissed >= DISMISSAL_PERIOD_DAYS) {
      // Clear old dismissal to reset the cycle
      localStorage.removeItem(DISMISSAL_STORAGE_KEY);
      return true;
    }

    return false;
  } catch (error) {
    // localStorage might not be available (private browsing, etc.)
    console.warn('Could not access localStorage for PWA prompt:', error);
    return true;
  }
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  // Memoized function to save dismissal timestamp
  const saveDismissal = useCallback(() => {
    try {
      localStorage.setItem(DISMISSAL_STORAGE_KEY, Date.now().toString());
    } catch (error) {
      console.warn('Could not save PWA dismissal to localStorage:', error);
    }
  }, []);

  useEffect(() => {
    // Check if running as standalone app (already installed)
    const checkStandalone = () => {
      // Check multiple methods for standalone detection
      const displayModeStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const navigatorStandalone = ('standalone' in window.navigator) && (window.navigator as { standalone?: boolean }).standalone === true;
      return displayModeStandalone || navigatorStandalone;
    };

    const standalone = checkStandalone();
    setIsStandalone(standalone);

    // Don't proceed if already installed
    if (standalone) {
      return;
    }

    // Check if iOS (including iPadOS with desktop mode)
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.userAgent.includes('Mac') && 'ontouchend' in document);
    setIsIOS(iOS);

    // Check if we should show the prompt based on 30-day dismissal rule
    const canShowPrompt = shouldShowPrompt();

    // For iOS, show the prompt after a delay if not recently dismissed
    if (iOS && canShowPrompt) {
      const timer = setTimeout(() => {
        setShowInstallPrompt(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    // Listen for beforeinstallprompt event (Android/Chrome/Edge)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Only show prompt if not recently dismissed (30-day rule)
      if (canShowPrompt) {
        // Show install prompt after a delay (don't be too aggressive)
        setTimeout(() => {
          setShowInstallPrompt(true);
        }, 3000);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
        // Clear any dismissal record since user installed
        try {
          localStorage.removeItem(DISMISSAL_STORAGE_KEY);
        } catch {
          // Ignore localStorage errors
        }
      } else {
        console.log('User dismissed the install prompt');
        saveDismissal();
      }
    } catch (error) {
      console.error('Error during install prompt:', error);
    }

    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const handleDismiss = useCallback(() => {
    setShowInstallPrompt(false);
    saveDismissal();
  }, [saveDismissal]);

  // Don't show if already installed or dismissed
  if (isStandalone || !showInstallPrompt) {
    return null;
  }

  // iOS Install Instructions
  if (isIOS && !isStandalone) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 shadow-lg z-50 animate-slide-up">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h3 className="font-semibold text-sm sm:text-base mb-1">
                📱 Install Budget App
              </h3>
              <p className="text-xs sm:text-sm opacity-90 mb-2">
                Add to your home screen for a better experience!
              </p>
              <div className="text-xs opacity-90 space-y-1">
                <p>1. Tap the Share button <span className="inline-block">⎙</span></p>
                <p>2. Scroll down and tap "Add to Home Screen"</p>
                <p>3. Tap "Add" to confirm</p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-white/80 hover:text-white text-2xl leading-none p-1"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Android/Chrome Install Prompt
  if (deferredPrompt) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 shadow-lg z-50 animate-slide-up">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <h3 className="font-semibold text-sm sm:text-base mb-1">
                📱 Install Budget App
              </h3>
              <p className="text-xs sm:text-sm opacity-90">
                Install our app for quick access and offline support!
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleInstallClick}
                className="px-4 py-2 bg-white text-indigo-600 rounded-lg font-semibold text-sm hover:bg-gray-100 transition whitespace-nowrap"
              >
                Install
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-2 text-white/80 hover:text-white text-sm"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

