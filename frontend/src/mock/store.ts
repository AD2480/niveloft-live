import { SCHEMA_VERSION, type MockDb } from './schema';
import { createSeedDb } from './seed';

export const MOCK_DB_STORAGE_KEY = 'projectflow.mockdb.v1';
const STORAGE_KEY = MOCK_DB_STORAGE_KEY;

let cache: MockDb | null = null;
let loading: Promise<MockDb> | null = null;

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/** Load the mock database from localStorage, seeding demo data on first use. */
export async function getDb(): Promise<MockDb> {
  if (cache) return cache;
  if (!loading) {
    loading = (async () => {
      const raw = storage()?.getItem(STORAGE_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as MockDb;
          if (parsed.schemaVersion === SCHEMA_VERSION) {
            cache = parsed;
            return parsed;
          }
        } catch {
          /* corrupted — reseed below */
        }
      }
      cache = await createSeedDb();
      saveDb();
      return cache;
    })().finally(() => {
      loading = null;
    });
  }
  return loading;
}

export function saveDb(): void {
  if (!cache) return;
  const s = storage();
  if (!s) return;
  try {
    s.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // Quota exceeded (usually large attachments). Drop stored file contents and retry once.
    for (const a of cache.attachments) a.dataUrl = null;
    try {
      s.setItem(STORAGE_KEY, JSON.stringify(cache));
    } catch {
      /* keep working in memory */
    }
  }
}

/** Replace all data with a fresh copy of the demo seed. */
export async function resetDb(): Promise<void> {
  cache = await createSeedDb();
  saveDb();
}

/** For tests: use an explicit in-memory database. */
export function setDbForTesting(db: MockDb | null): void {
  cache = db;
}

/** Another tab changed the stored data: drop the in-memory copy so the next request re-reads it. */
export function forgetCachedDb(): void {
  cache = null;
}
