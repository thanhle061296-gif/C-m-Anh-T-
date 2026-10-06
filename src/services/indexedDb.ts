import { DatabaseState } from '../types';

const DB_NAME = 'CamDoAnhTu_Store_v1';
const DB_VERSION = 1;
const STATE_STORE = 'app_state';
const MUTATION_STORE = 'pending_mutations';

export interface PendingMutation {
  id: string;
  type: string;
  payload: any;
  timestamp: string;
}

export function openLocalDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB không được hỗ trợ trên thiết bị này.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result as IDBDatabase;
      if (!db.objectStoreNames.contains(STATE_STORE)) {
        db.createObjectStore(STATE_STORE, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(MUTATION_STORE)) {
        db.createObjectStore(MUTATION_STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveLocalState(state: DatabaseState): Promise<void> {
  try {
    const db = await openLocalDB();
    const tx = db.transaction(STATE_STORE, 'readwrite');
    const store = tx.objectStore(STATE_STORE);
    store.put({ key: 'current_state', value: state, savedAt: new Date().toISOString() });
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Could not save to IndexedDB, fallback to localStorage', err);
    try {
      localStorage.setItem('CamDoAnhTu_fallback_state', JSON.stringify(state));
    } catch {}
  }
}

export async function getLocalState(): Promise<DatabaseState | null> {
  try {
    const db = await openLocalDB();
    const tx = db.transaction(STATE_STORE, 'readonly');
    const store = tx.objectStore(STATE_STORE);
    const req = store.get('current_state');

    return new Promise((resolve) => {
      req.onsuccess = () => {
        if (req.result && req.result.value) {
          resolve(req.result.value);
        } else {
          // Check fallback localStorage
          const fallback = localStorage.getItem('CamDoAnhTu_fallback_state');
          if (fallback) {
            try {
              resolve(JSON.parse(fallback));
              return;
            } catch {}
          }
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('Failed to read IndexedDB', err);
    return null;
  }
}

export async function addPendingMutation(mutation: PendingMutation): Promise<void> {
  try {
    const db = await openLocalDB();
    const tx = db.transaction(MUTATION_STORE, 'readwrite');
    const store = tx.objectStore(MUTATION_STORE);
    store.put(mutation);
  } catch (err) {
    console.error('Error recording pending mutation', err);
  }
}

export async function getPendingMutations(): Promise<PendingMutation[]> {
  try {
    const db = await openLocalDB();
    const tx = db.transaction(MUTATION_STORE, 'readonly');
    const store = tx.objectStore(MUTATION_STORE);
    const req = store.getAll();

    return new Promise((resolve) => {
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch (err) {
    return [];
  }
}

export async function clearPendingMutations(ids: string[]): Promise<void> {
  try {
    const db = await openLocalDB();
    const tx = db.transaction(MUTATION_STORE, 'readwrite');
    const store = tx.objectStore(MUTATION_STORE);
    for (const id of ids) {
      store.delete(id);
    }
  } catch (err) {
    console.error('Error clearing pending mutations', err);
  }
}
