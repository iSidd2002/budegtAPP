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
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
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
        db.close();
        reject(transaction.error);
      };
    });
  } catch (error) {
    console.error('[Storage] IndexedDB setItem error:', error);
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
        db.close();
        resolve(request.result || null);
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('[Storage] IndexedDB getItem error:', error);
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
    console.error('[Storage] IndexedDB removeItem error:', error);
    // Fallback to localStorage
    localStorage.removeItem(key);
  }
}

// Public API with dual storage (IndexedDB + localStorage for redundancy)
export const storage = {
  async setItem(key: string, value: string): Promise<void> {
    console.log(`[Storage] Setting ${key}`);
    // Store in both IndexedDB and localStorage for maximum compatibility
    localStorage.setItem(key, value);
    await setItemIDB(key, value);
  },

  async getItem(key: string): Promise<string | null> {
    // Try IndexedDB first (more reliable on iOS PWA)
    let value = await getItemIDB(key);
    
    // If not in IndexedDB, try localStorage
    if (!value) {
      value = localStorage.getItem(key);
      // If found in localStorage, sync to IndexedDB
      if (value) {
        console.log(`[Storage] Found ${key} in localStorage, syncing to IndexedDB`);
        await setItemIDB(key, value);
      }
    }
    
    console.log(`[Storage] Getting ${key}:`, !!value);
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

