/**
 * Persistent storage utility for PWA authentication
 * Uses IndexedDB for iOS PWA compatibility (more reliable than localStorage)
 * Falls back to localStorage if IndexedDB is not available
 */

const DB_NAME = 'BudgetAppDB';
const STORE_NAME = 'auth';
const DB_VERSION = 1;

// Initialize IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    console.log('[Storage] Opening IndexedDB...');
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[Storage] IndexedDB open error:', request.error);
      reject(request.error);
    };
    request.onsuccess = () => {
      console.log('[Storage] IndexedDB opened successfully');
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      console.log('[Storage] IndexedDB upgrade needed');
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        console.log('[Storage] Creating auth object store');
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

// Set item in IndexedDB
async function setItemIDB(key: string, value: string): Promise<void> {
  try {
    console.log(`[Storage] Setting ${key} in IndexedDB`);
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.put(value, key);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        console.log(`[Storage] Successfully set ${key} in IndexedDB`);
        db.close();
        resolve();
      };
      transaction.onerror = () => {
        console.error(`[Storage] Failed to set ${key} in IndexedDB:`, transaction.error);
        db.close();
        reject(transaction.error);
      };
    });
  } catch (error) {
    console.error('[Storage] IndexedDB setItem error:', error);
    // Fallback to localStorage
    console.log(`[Storage] Falling back to localStorage for ${key}`);
    localStorage.setItem(key, value);
  }
}

// Get item from IndexedDB
async function getItemIDB(key: string): Promise<string | null> {
  try {
    console.log(`[Storage] Getting ${key} from IndexedDB`);
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const result = request.result || null;
        console.log(`[Storage] Got ${key} from IndexedDB:`, !!result);
        db.close();
        resolve(result);
      };
      request.onerror = () => {
        console.error(`[Storage] Failed to get ${key} from IndexedDB:`, request.error);
        db.close();
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('[Storage] IndexedDB getItem error:', error);
    // Fallback to localStorage
    console.log(`[Storage] Falling back to localStorage for ${key}`);
    const result = localStorage.getItem(key);
    console.log(`[Storage] Got ${key} from localStorage:`, !!result);
    return result;
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
    console.error('[Storage] IndexedDB removeItem error:', error);
    // Fallback to localStorage
    localStorage.removeItem(key);
  }
}

// Public API with dual storage (IndexedDB + localStorage for redundancy)
export const storage = {
  async setItem(key: string, value: string): Promise<void> {
    console.log(`[Storage] PUBLIC API: Setting ${key}`, value ? `(${value.length} chars)` : '(empty)');
    // Store in both IndexedDB and localStorage for maximum compatibility
    try {
      localStorage.setItem(key, value);
      console.log(`[Storage] Successfully set ${key} in localStorage`);
    } catch (error) {
      console.error(`[Storage] Failed to set ${key} in localStorage:`, error);
    }

    try {
      await setItemIDB(key, value);
    } catch (error) {
      console.error(`[Storage] Failed to set ${key} in IndexedDB:`, error);
    }
  },

  async getItem(key: string): Promise<string | null> {
    console.log(`[Storage] PUBLIC API: Getting ${key}`);

    // Try IndexedDB first (more reliable on iOS PWA)
    let value = await getItemIDB(key);

    // If not in IndexedDB, try localStorage
    if (!value) {
      console.log(`[Storage] ${key} not found in IndexedDB, trying localStorage`);
      value = localStorage.getItem(key);
      // If found in localStorage, sync to IndexedDB
      if (value) {
        console.log(`[Storage] Found ${key} in localStorage, syncing to IndexedDB`);
        await setItemIDB(key, value);
      }
    }

    console.log(`[Storage] PUBLIC API: Got ${key}:`, !!value, value ? `(${value.length} chars)` : '(null)');
    return value;
  },

  async removeItem(key: string): Promise<void> {
    console.log(`[Storage] Removing ${key}`);
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
    setItemIDB(key, value).catch(console.error);
  },

  removeItemSync(key: string): void {
    localStorage.removeItem(key);
    // Async remove from IndexedDB (fire and forget)
    removeItemIDB(key).catch(console.error);
  },
};

