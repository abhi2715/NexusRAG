// Minimal promise-based IndexedDB wrapper.
// localStorage tops out at ~5MB, too small for indexed documents, so sessions and docs live here.

const DB_NAME = 'nexusrag';
const DB_VERSION = 1;
export const STORES = { sessions: 'sessions', docs: 'docs' };

let dbPromise = null;

function open() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB unavailable'));
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      Object.values(STORES).forEach(name => {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: 'id' });
      });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(store, mode, fn) {
  return open().then(db => new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    const result = fn(s);
    t.oncomplete = () => resolve(result?.result ?? result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  }));
}

export const dbGetAll = store =>
  tx(store, 'readonly', s => s.getAll()).catch(err => { console.warn('dbGetAll', err); return []; });

export const dbPut = (store, value) =>
  tx(store, 'readwrite', s => s.put(value)).catch(err => console.warn('dbPut', err));

export const dbDelete = (store, id) =>
  tx(store, 'readwrite', s => s.delete(id)).catch(err => console.warn('dbDelete', err));

export const dbClear = store =>
  tx(store, 'readwrite', s => s.clear()).catch(err => console.warn('dbClear', err));
