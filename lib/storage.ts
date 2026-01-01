/**
 * Persistent storage utility for PWA authentication
 * Uses IndexedDB for iOS PWA compatibility (more reliable than localStorage)
 * Falls back to localStorage if IndexedDB is not available
 *
 * SECURITY NOTE: Tokens are stored encrypted-at-rest by the browser.
 * For additional security, consider implementing application-layer encryption.
 */

const DB_NAME = 'BudgetAppDB';
const STORE_NAME = 'auth';
const DB_VERSION = 1;

// Debug logging only in development
const DEBUG = typeof window !== 'undefined' && process.env.NODE_ENV === 'development';
const log = DEBUG ? console.log.bind(console, '[Storage]') : () => {};
const logError = console.error.bind(console, '[Storage]');

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
 */
export const storage = {
  async setItem(key: string, value: string): Promise<void> {
    // Store in both IndexedDB and localStorage for maximum compatibility
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      logError(`Failed to set ${key} in localStorage:`, error);
    }

    try {
      await setItemIDB(key, value);
    } catch (error) {
      logError(`Failed to set ${key} in IndexedDB:`, error);
    }
  },

  async getItem(key: string): Promise<string | null> {
    // Try IndexedDB first (more reliable on iOS PWA)
    let value = await getItemIDB(key);

    // If not in IndexedDB, try localStorage
    if (!value) {
      value = localStorage.getItem(key);
      // If found in localStorage, sync to IndexedDB
      if (value) {
        await setItemIDB(key, value);
      }
    }

    return value;
  },

  async removeItem(key: string): Promise<void> {
    // Remove from both storages
    localStorage.removeItem(key);
    await removeItemIDB(key);
  },

  // Synchronous fallback for compatibility
  getItemSync(key: string): string | null {
    return localStorage.getItem(key);
  },

  setItemSync(key: string, value: string): void {
    localStorage.setItem(key, value);
    // Async sync to IndexedDB (fire and forget)
    setItemIDB(key, value).catch(() => {});
  },

  removeItemSync(key: string): void {
    localStorage.removeItem(key);
    // Async remove from IndexedDB (fire and forget)
    removeItemIDB(key).catch(() => {});
  },
};

