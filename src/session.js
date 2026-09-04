// Ustawienia -> localStorage (małe, synchroniczne).
// Ostatni obrazek -> IndexedDB (blob, za duży na localStorage).
// Wszystko best-effort: w prywatnym oknie / przy zablokowanych danych witryny
// każdy dostęp może rzucić, a appka ma wtedy po prostu działać bez pamięci.

const SETTINGS_KEY = 'top:settings:v1';
const DB_NAME = 'transform-origin-picker';
const STORE = 'session';
const RECORD_KEY = 'last';

const PERSISTED = [
  'unit', 'precision', 'step', 'snap', 'loupe', 'ghost',
  'previewInStage', 'autoCopy', 'template', 'preview', 'pins',
];

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return Object.fromEntries(PERSISTED.filter((key) => key in parsed).map((key) => [key, parsed[key]]));
  } catch {
    return {};
  }
}

export function saveSettings(state) {
  try {
    const payload = Object.fromEntries(PERSISTED.map((key) => [key, state[key]]));
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(payload));
  } catch {
    // brak miejsca albo zablokowane dane witryny — trudno
  }
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    let request;
    try {
      request = indexedDB.open(DB_NAME, 1);
    } catch (error) {
      reject(error);
      return;
    }
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('IndexedDB blocked'));
  });
}

async function withStore(mode, run) {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, mode);
      const result = run(transaction.objectStore(STORE));
      transaction.oncomplete = () => resolve(result.result ?? null);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

/** Zapisuje ostatni obrazek razem z jego originem, żeby przeżył odświeżenie. */
export async function saveLastImage(blob, name, origin) {
  try {
    await withStore('readwrite', (store) => store.put({ blob, name, origin, savedAt: Date.now() }, RECORD_KEY));
  } catch {
    // pamięć niedostępna — appka działa dalej, po prostu bez wznawiania sesji
  }
}

export async function loadLastImage() {
  try {
    return await withStore('readonly', (store) => store.get(RECORD_KEY));
  } catch {
    return null;
  }
}

export async function clearLastImage() {
  try {
    await withStore('readwrite', (store) => store.delete(RECORD_KEY));
  } catch {
    // j.w.
  }
}
