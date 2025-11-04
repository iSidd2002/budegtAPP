'use client';

import { useEffect, useState } from 'react';
import { storage } from '@/lib/storage';

export default function TestStoragePage() {
  const [results, setResults] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const testStorage = async () => {
      console.log('[TEST] Starting storage persistence test...');
      
      const testResults: any = {
        timestamp: new Date().toISOString(),
        tests: {},
      };

      // Test 1: Check if tokens exist
      try {
        const accessToken = await storage.getItem('accessToken');
        const refreshToken = await storage.getItem('refreshToken');
        
        testResults.tests.tokenExistence = {
          accessToken: !!accessToken,
          accessTokenLength: accessToken?.length || 0,
          refreshToken: !!refreshToken,
          refreshTokenLength: refreshToken?.length || 0,
        };
      } catch (error) {
        testResults.tests.tokenExistence = { error: error.message };
      }

      // Test 2: Check localStorage directly
      try {
        const lsAccessToken = localStorage.getItem('accessToken');
        const lsRefreshToken = localStorage.getItem('refreshToken');
        
        testResults.tests.localStorage = {
          accessToken: !!lsAccessToken,
          accessTokenLength: lsAccessToken?.length || 0,
          refreshToken: !!lsRefreshToken,
          refreshTokenLength: lsRefreshToken?.length || 0,
        };
      } catch (error) {
        testResults.tests.localStorage = { error: error.message };
      }

      // Test 3: Check IndexedDB directly
      try {
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open('BudgetAppDB', 1);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
          request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains('auth')) {
              db.createObjectStore('auth');
            }
          };
        });

        const transaction = db.transaction('auth', 'readonly');
        const store = transaction.objectStore('auth');
        
        const accessTokenReq = store.get('accessToken');
        const refreshTokenReq = store.get('refreshToken');
        
        const [idbAccessToken, idbRefreshToken] = await Promise.all([
          new Promise(resolve => {
            accessTokenReq.onsuccess = () => resolve(accessTokenReq.result);
            accessTokenReq.onerror = () => resolve(null);
          }),
          new Promise(resolve => {
            refreshTokenReq.onsuccess = () => resolve(refreshTokenReq.result);
            refreshTokenReq.onerror = () => resolve(null);
          }),
        ]);

        testResults.tests.indexedDB = {
          accessToken: !!idbAccessToken,
          accessTokenLength: idbAccessToken?.length || 0,
          refreshToken: !!idbRefreshToken,
          refreshTokenLength: idbRefreshToken?.length || 0,
        };

        db.close();
      } catch (error) {
        testResults.tests.indexedDB = { error: error.message };
      }

      // Test 4: Check cookies
      try {
        const cookies = document.cookie.split(';').reduce((acc, cookie) => {
          const [name, value] = cookie.trim().split('=');
          acc[name] = value;
          return acc;
        }, {} as Record<string, string>);

        testResults.tests.cookies = {
          refreshToken: !!cookies.refreshToken,
          refreshTokenLength: cookies.refreshToken?.length || 0,
          allCookies: Object.keys(cookies),
        };
      } catch (error) {
        testResults.tests.cookies = { error: error.message };
      }

      // Test 5: Test token verification
      try {
        const accessToken = await storage.getItem('accessToken');
        if (accessToken) {
          const response = await fetch('/api/auth/verify', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          
          testResults.tests.tokenVerification = {
            status: response.status,
            valid: response.ok,
            response: response.ok ? await response.json() : await response.text(),
          };
        } else {
          testResults.tests.tokenVerification = { error: 'No access token found' };
        }
      } catch (error) {
        testResults.tests.tokenVerification = { error: error.message };
      }

      console.log('[TEST] Storage test complete:', testResults);
      setResults(testResults);
      setLoading(false);
    };

    testStorage();
  }, []);

  const writeTestTokens = async () => {
    const testAccessToken = 'test-access-token-' + Date.now();
    const testRefreshToken = 'test-refresh-token-' + Date.now();
    
    await storage.setItem('testAccessToken', testAccessToken);
    await storage.setItem('testRefreshToken', testRefreshToken);
    
    alert('Test tokens written. Close browser completely, reopen this page, and check if they persist.');
  };

  const checkTestTokens = async () => {
    const testAccessToken = await storage.getItem('testAccessToken');
    const testRefreshToken = await storage.getItem('testRefreshToken');
    
    alert(`Test tokens: Access=${!!testAccessToken}, Refresh=${!!testRefreshToken}`);
  };

  if (loading) {
    return <div className="p-8">Running storage tests...</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Storage Persistence Test</h1>
      
      <div className="mb-4 space-x-4">
        <button 
          onClick={writeTestTokens}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Write Test Tokens
        </button>
        <button 
          onClick={checkTestTokens}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Check Test Tokens
        </button>
        <a 
          href="/"
          className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 inline-block"
        >
          Back to Login
        </a>
      </div>

      <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded overflow-auto text-sm">
        {JSON.stringify(results, null, 2)}
      </pre>
    </div>
  );
}
