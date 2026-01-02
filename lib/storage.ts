/**
 * Persistent storage utility for PWA authentication
 * Uses IndexedDB for iOS PWA compatibility (more reliable than localStorage)
 * Falls back to localStorage if IndexedDB is not available
 *
 * SECURITY NOTE: Tokens are stored encrypted-at-rest by the browser.
 * For additional security, consider implementing application-layer encryption.
 *
 * iOS PWA CONSIDERATIONS:
 * - iOS Safari can evict IndexedDB after 7 days of inactivity
 * - We use dual storage (IndexedDB + localStorage) for redundancy
 * - The keepalive endpoint helps maintain "activity" status
 * - Storage quota is limited in PWA mode (~50MB typically)
 */

const DB_NAME = 'BudgetAppDB';
const STORE_NAME = 'auth';
const DB_VERSION = 1;

// Track storage availability
let indexedDBAvailable: boolean | null = null;
let localStorageAvailable: boolean | null = null;

// Debug logging only in development
const DEBUG = typeof window !== 'undefined' && process.env.NODE_ENV === 'development';
const log = DEBUG ? console.log.bind(console, '[Storage]') : () => {};
const logError = console.error.bind(console, '[Storage]');

/**
 * Check if localStorage is available and working
 */
function checkLocalStorage(): boolean {
  if (localStorageAvailable !== null) return localStorageAvailable;

  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    localStorageAvailable = true;
    return true;
  } catch {
    logError('localStorage not available');
    localStorageAvailable = false;
    return false;
  }
}

/**
 * Check if IndexedDB is available and working
 */
async function checkIndexedDB(): Promise<boolean> {
  if (indexedDBAvailable !== null) return indexedDBAvailable;

  try {
    if (typeof indexedDB === 'undefined') {
      indexedDBAvailable = false;
      return false;
    }

    // Try to open a test database
    const testDb = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('__test__', 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('test')) {
          db.createObjectStore('test');
        }
      };
    });

    testDb.close();

    // Clean up test database
    indexedDB.deleteDatabase('__test__');

    indexedDBAvailable = true;
    return true;
  } catch {
    logError('IndexedDB not available');
    indexedDBAvailable = false;
    return false;
  }
}

// Initialize IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      logError('IndexedDB open error:', request.error);
      reject(request.error);
    };
    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      log('IndexedDB upgrade needed');
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

// Set item in IndexedDB
async function setItemIDB(key: string, value: string): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.put(value, key);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => {
        logError(`Failed to set ${key} in IndexedDB:`, transaction.error);
        db.close();
        reject(transaction.error);
      };
    });
  } catch (error) {
    logError('IndexedDB setItem error:', error);
    // Fallback to localStorage
    localStorage.setItem(key, value);
  }
}

// Get item from IndexedDB
async function getItemIDB(key: string): Promise<string | null> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const result = request.result || null;
        db.close();
        resolve(result);
      };
      request.onerror = () => {
        logError(`Failed to get ${key} from IndexedDB:`, request.error);
        db.close();
        reject(request.error);
      };
    });
  } catch (error) {
    logError('IndexedDB getItem error:', error);
    // Fallback to localStorage
    return localStorage.getItem(key);
  }
}

// Remove item from IndexedDB
async function removeItemIDB(key: string): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.delete(key);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    });
  } catch (error) {
    logError('IndexedDB removeItem error:', error);
    // Fallback to localStorage
    localStorage.removeItem(key);
  }
}

/**
 * Public API with dual storage (IndexedDB + localStorage for redundancy)
 *
 * Security considerations:
 * - Tokens are stored in browser storage (accessible to same-origin scripts)
 * - XSS attacks could potentially access these tokens
 * - The httpOnly cookie provides additional protection for the refresh token
 *
 * iOS PWA Storage Strategy:
 * - Store in BOTH IndexedDB and localStorage for redundancy
 * - Read from IndexedDB first (more persistent on iOS), fallback to localStorage
 * - Auto-sync between storages when discrepancies found
 * - Handle quota errors gracefully
 */
export const storage = {
  /**
   * Store item in both IndexedDB and localStorage
   * Handles quota errors and storage unavailability gracefully
   */
  async setItem(key: string, value: string): Promise<void> {
    let storedSomewhere = false;

    // Try localStorage first (synchronous, always available in browser)
    if (checkLocalStorage()) {
      try {
        localStorage.setItem(key, value);
        storedSomewhere = true;
        log(`Set ${key} in localStorage`);
      } catch (error) {
        // Could be QuotaExceededError
        logError(`Failed to set ${key} in localStorage:`, error);

        // Try to clear old data and retry
        try {
          // Clear any non-essential cached data
          const keysToKeep = ['accessToken', 'refreshToken', 'theme'];
          for (let i = localStorage.length - 1; i >= 0; i--) {
            const k = localStorage.key(i);
            if (k && !keysToKeep.includes(k)) {
              localStorage.removeItem(k);
            }
          }
          localStorage.setItem(key, value);
          storedSomewhere = true;
        } catch {
          logError(`Failed to set ${key} even after clearing localStorage`);
        }
      }
    }

    // Try IndexedDB (async, more persistent on iOS)
    if (await checkIndexedDB()) {
      try {
        await setItemIDB(key, value);
        storedSomewhere = true;
        log(`Set ${key} in IndexedDB`);
      } catch (error) {
        logError(`Failed to set ${key} in IndexedDB:`, error);
      }
    }

    if (!storedSomewhere) {
      logError(`WARNING: Could not store ${key} in any storage!`);
    }
  },

  /**
   * Get item from storage with fallback chain
   * IndexedDB -> localStorage -> null
   * Auto-syncs if found in one but not the other
   */
  async getItem(key: string): Promise<string | null> {
    let idbValue: string | null = null;
    let lsValue: string | null = null;

    // Try IndexedDB first (more reliable on iOS PWA)
    if (await checkIndexedDB()) {
      try {
        idbValue = await getItemIDB(key);
      } catch {
        // IndexedDB failed, will try localStorage
      }
    }

    // Try localStorage
    if (checkLocalStorage()) {
      try {
        lsValue = localStorage.getItem(key);
      } catch {
        // localStorage failed
      }
    }

    // Determine best value and sync storages
    if (idbValue && !lsValue) {
      // Found in IndexedDB but not localStorage - sync
      log(`Found ${key} in IndexedDB only, syncing to localStorage`);
      if (checkLocalStorage()) {
        try {
          localStorage.setItem(key, idbValue);
        } catch {
          // Ignore sync error
        }
      }
      return idbValue;
    } else if (!idbValue && lsValue) {
      // Found in localStorage but not IndexedDB - sync
      log(`Found ${key} in localStorage only, syncing to IndexedDB`);
      if (await checkIndexedDB()) {
        try {
          await setItemIDB(key, lsValue);
        } catch {
          // Ignore sync error
        }
      }
      return lsValue;
    } else if (idbValue && lsValue) {
      // Found in both - prefer IndexedDB (more recent on iOS)
      return idbValue;
    }

    return null;
  },

  /**
   * Remove item from all storages
   */
  async removeItem(key: string): Promise<void> {
    // Remove from localStorage
    if (checkLocalStorage()) {
      try {
        localStorage.removeItem(key);
      } catch {
        // Ignore
      }
    }

    // Remove from IndexedDB
    if (await checkIndexedDB()) {
      try {
        await removeItemIDB(key);
      } catch {
        // Ignore
      }
    }
  },

  // Synchronous fallback for compatibility (uses localStorage only)
  getItemSync(key: string): string | null {
    if (!checkLocalStorage()) return null;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  setItemSync(key: string, value: string): void {
    if (checkLocalStorage()) {
      try {
        localStorage.setItem(key, value);
      } catch {
        // Ignore
      }
    }
    // Async sync to IndexedDB (fire and forget)
    checkIndexedDB().then(available => {
      if (available) {
        setItemIDB(key, value).catch(() => {});
      }
    });
  },

  removeItemSync(key: string): void {
    if (checkLocalStorage()) {
      try {
        localStorage.removeItem(key);
      } catch {
        // Ignore
      }
    }
    // Async remove from IndexedDB (fire and forget)
    checkIndexedDB().then(available => {
      if (available) {
        removeItemIDB(key).catch(() => {});
      }
    });
  },

  /**
   * Check storage health - useful for debugging auth issues
   */
  async checkHealth(): Promise<{
    localStorage: boolean;
    indexedDB: boolean;
    accessToken: boolean;
    refreshToken: boolean;
  }> {
    const lsAvailable = checkLocalStorage();
    const idbAvailable = await checkIndexedDB();

    let hasAccessToken = false;
    let hasRefreshToken = false;

    if (lsAvailable) {
      hasAccessToken = !!localStorage.getItem('accessToken');
      hasRefreshToken = !!localStorage.getItem('refreshToken');
    }

    if (!hasAccessToken && idbAvailable) {
      try {
        hasAccessToken = !!(await getItemIDB('accessToken'));
      } catch {}
    }

    if (!hasRefreshToken && idbAvailable) {
      try {
        hasRefreshToken = !!(await getItemIDB('refreshToken'));
      } catch {}
    }

    return {
      localStorage: lsAvailable,
      indexedDB: idbAvailable,
      accessToken: hasAccessToken,
      refreshToken: hasRefreshToken,
    };
  },
};

