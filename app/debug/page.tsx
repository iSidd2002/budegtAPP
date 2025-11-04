'use client';

import { useEffect, useState } from 'react';
import { storage } from '@/lib/storage';

export default function DebugPage() {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const runDiagnostics = async () => {
      console.log('[DEBUG PAGE] Starting comprehensive auth diagnostics...');
      
      const info: any = {
        timestamp: new Date().toISOString(),
        environment: {
          nodeEnv: process.env.NODE_ENV,
          userAgent: navigator.userAgent,
          isStandalone: window.matchMedia('(display-mode: standalone)').matches,
          isPWA: (window.navigator as any).standalone === true,
          cookieEnabled: navigator.cookieEnabled,
        },
        storage: {},
        api: {},
        indexedDB: {},
        localStorage: {},
      };

      // Check storage
      try {
        const accessToken = await storage.getItem('accessToken');
        const refreshToken = await storage.getItem('refreshToken');
        
        info.storage = {
          accessToken: !!accessToken,
          accessTokenLength: accessToken?.length || 0,
          refreshToken: !!refreshToken,
          refreshTokenLength: refreshToken?.length || 0,
        };
      } catch (error) {
        info.storage.error = error instanceof Error ? error.message : String(error);
      }

      // Check localStorage directly
      try {
        const lsAccessToken = localStorage.getItem('accessToken');
        const lsRefreshToken = localStorage.getItem('refreshToken');
        
        info.localStorage = {
          accessToken: !!lsAccessToken,
          accessTokenLength: lsAccessToken?.length || 0,
          refreshToken: !!lsRefreshToken,
          refreshTokenLength: lsRefreshToken?.length || 0,
          allKeys: Object.keys(localStorage),
        };
      } catch (error) {
        info.localStorage.error = error instanceof Error ? error.message : String(error);
      }

      // Check IndexedDB directly
      try {
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open('BudgetAppDB', 1);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });

        const transaction = db.transaction('auth', 'readonly');
        const store = transaction.objectStore('auth');
        
        const accessTokenReq = store.get('accessToken');
        const refreshTokenReq = store.get('refreshToken');
        
        const [idbAccessToken, idbRefreshToken] = await Promise.all([
          new Promise<string | null>(resolve => {
            accessTokenReq.onsuccess = () => resolve(accessTokenReq.result);
            accessTokenReq.onerror = () => resolve(null);
          }),
          new Promise<string | null>(resolve => {
            refreshTokenReq.onsuccess = () => resolve(refreshTokenReq.result);
            refreshTokenReq.onerror = () => resolve(null);
          }),
        ]);

        info.indexedDB = {
          accessToken: !!idbAccessToken,
          accessTokenLength: (idbAccessToken as string)?.length || 0,
          refreshToken: !!idbRefreshToken,
          refreshTokenLength: (idbRefreshToken as string)?.length || 0,
        };

        db.close();
      } catch (error) {
        info.indexedDB.error = error instanceof Error ? error.message : String(error);
      }

      // Test API endpoints
      try {
        const debugResponse = await fetch('/api/auth/debug');
        if (debugResponse.ok) {
          info.api.debug = await debugResponse.json();
        } else {
          info.api.debug = { error: `${debugResponse.status}: ${debugResponse.statusText}` };
        }
      } catch (error) {
        info.api.debug = { error: error instanceof Error ? error.message : String(error) };
      }

      // Test verify endpoint if we have a token
      if (info.storage.accessToken) {
        try {
          const accessToken = await storage.getItem('accessToken');
          const verifyResponse = await fetch('/api/auth/verify', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          
          if (verifyResponse.ok) {
            info.api.verify = await verifyResponse.json();
          } else {
            info.api.verify = { 
              error: `${verifyResponse.status}: ${verifyResponse.statusText}`,
              body: await verifyResponse.text()
            };
          }
        } catch (error) {
          info.api.verify = { error: error instanceof Error ? error.message : String(error) };
        }
      }

      // Test refresh endpoint if we have a refresh token
      if (info.storage.refreshToken) {
        try {
          const refreshToken = await storage.getItem('refreshToken');
          const refreshResponse = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });
          
          if (refreshResponse.ok) {
            info.api.refresh = await refreshResponse.json();
          } else {
            info.api.refresh = { 
              error: `${refreshResponse.status}: ${refreshResponse.statusText}`,
              body: await refreshResponse.text()
            };
          }
        } catch (error) {
          info.api.refresh = { error: error instanceof Error ? error.message : String(error) };
        }
      }

      console.log('[DEBUG PAGE] Diagnostics complete:', info);
      setDebugInfo(info);
      setLoading(false);
    };

    runDiagnostics();
  }, []);

  const clearStorage = async () => {
    await storage.removeItem('accessToken');
    await storage.removeItem('refreshToken');
    localStorage.clear();
    
    // Clear IndexedDB
    try {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('BudgetAppDB', 1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      const transaction = db.transaction('auth', 'readwrite');
      const store = transaction.objectStore('auth');
      store.clear();
      db.close();
    } catch (error) {
      console.error('Failed to clear IndexedDB:', error);
    }
    
    window.location.reload();
  };

  if (loading) {
    return <div className="p-8">Loading diagnostics...</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Auth Debug Information</h1>
      
      <div className="mb-4">
        <button 
          onClick={clearStorage}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Clear All Storage & Reload
        </button>
      </div>

      <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded overflow-auto text-sm">
        {JSON.stringify(debugInfo, null, 2)}
      </pre>
    </div>
  );
}
