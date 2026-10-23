// Lands store, persisted in IndexedDB. Reads go through an in-memory cache filled once on first use;
// writes update the cache synchronously and are written through (geometry edits debounced).
// Swap these functions for API calls later; the routes only depend on this module's signatures.
import type { LandModel } from '../editor/types';

export interface LandRecord {
  id: string;
  name: string;
  model: LandModel;
  updatedAt: number;
}

const DB = 'land-divider', STORE = 'lands', SAVE_DELAY = 400;

const lands = new Map<string, LandRecord>();
let dbp: Promise<IDBDatabase | null> | null = null;
let ready: Promise<void> | null = null;
const pending = new Map<string, ReturnType<typeof setTimeout>>();

/** Opens the database once; null when IndexedDB is unavailable (private mode etc.) - the store then lives in memory only. */
function db(): Promise<IDBDatabase | null> {
  dbp ??= new Promise((ok) => {
    try {
      const rq = indexedDB.open(DB, 1);
      rq.onupgradeneeded = () => rq.result.createObjectStore(STORE, { keyPath: 'id' });
      rq.onsuccess = () => ok(rq.result);
      rq.onerror = () => ok(null);
      rq.onblocked = () => ok(null);
    } catch {
      ok(null);
    }
  });
  return dbp;
}

function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> {
  return db().then(
    (d) =>
      d &&
      new Promise<T | undefined>((ok) => {
        try {
          const rq = run(d.transaction(STORE, mode).objectStore(STORE));
          rq.onsuccess = () => ok(rq.result);
          rq.onerror = () => {
            console.error('IndexedDB', rq.error);
            ok(undefined);
          };
        } catch (e) {
          console.error('IndexedDB', e);
          ok(undefined);
        }
      }),
  ) as Promise<T | undefined>;
}

function load(): Promise<void> {
  ready ??= tx('readonly', (s) => s.getAll() as IDBRequest<LandRecord[]>).then((all) => {
    for (const r of all ?? []) if (!lands.has(r.id)) lands.set(r.id, r);
  });
  return ready;
}

function write(id: string) {
  const t = pending.get(id);
  if (t) clearTimeout(t);
  pending.delete(id);
  const rec = lands.get(id);
  if (rec) void tx('readwrite', (s) => s.put(rec));
}

function writeLater(id: string) {
  const t = pending.get(id);
  if (t) clearTimeout(t);
  pending.set(id, setTimeout(() => write(id), SAVE_DELAY));
}

// Do not lose the last debounced edit when the tab is hidden or closed.
if (typeof document !== 'undefined')
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') [...pending.keys()].forEach(write);
  });

/** All lands, most recently changed first. */
export async function listLands(): Promise<LandRecord[]> {
  await load();
  return [...lands.values()].sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getLand(id: string): Promise<LandRecord | undefined> {
  await load();
  return lands.get(id);
}

export function createLand(name: string, model: LandModel): LandRecord {
  let id = 'arazi-' + Date.now().toString(36);
  for (let n = 2; lands.has(id); n++) id = 'arazi-' + Date.now().toString(36) + '-' + n;
  const rec = { id, name, model, updatedAt: Date.now() };
  lands.set(id, rec);
  write(id);
  return rec;
}

export function renameLand(id: string, name: string) {
  const rec = lands.get(id);
  if (!rec) return;
  lands.set(id, { ...rec, name, updatedAt: Date.now() });
  write(id);
}

export function saveLand(id: string, model: LandModel) {
  const rec = lands.get(id);
  if (!rec) return;
  lands.set(id, { ...rec, model, updatedAt: Date.now() });
  writeLater(id);
}
