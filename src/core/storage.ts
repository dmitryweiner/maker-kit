// What survives a reload, in localStorage. A record is one key with a
// version: the app says how to write its value and how to read back what any
// version of it stored, sanitised field by field. Every access is in
// try/catch: storage may be blocked (private mode), full, or hold garbage
// from another version — the app opens regardless.
//
// A failed write says why: the work is the person's, so the app shows it
// (ui/banner), nothing is swallowed. All apps on <user>.github.io share one
// origin: every key starts with the app id (`__APP_ID__`).

export type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
/** blocked: nothing is ever kept (private mode, no storage); full: the quota is spent, deleting something helps */
export type StorageWrite = 'ok' | 'blocked' | 'full';

export interface StoredRecord<V> {
  /** `${__APP_ID__}`, `${__APP_ID__}-model`, or a legacy key */
  key: string;
  /** a whole number from 1; bumped with every change of what `write` gives */
  version: number;
  /** The stored fields of a value, kept as JSON beside `version`. */
  write(value: V): Readonly<Record<string, unknown>>;
  /**
   * Sanitises what was stored by this or an older version: `data` is the
   * parsed JSON as it is (`version` among its fields); a value stored with no
   * version at all comes as version 0. null: start fresh.
   */
  read(data: unknown, version: number): V | null;
}

/** localStorage, or null when the browser blocks it (the getter itself throws then). */
export function browserStorage(): KeyValueStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** The stored value, or null for none, an unreadable one or one of a newer version. */
export function loadRecord<V>(storage: KeyValueStorage | null, record: StoredRecord<V>): V | null {
  try {
    const raw = storage?.getItem(record.key);
    if (!raw) return null;
    const data: unknown = JSON.parse(raw);
    const version = storedVersion(data);
    if (version === null || version > record.version) return null;
    return record.read(data, version);
  } catch {
    return null;
  }
}

export function saveRecord<V>(storage: KeyValueStorage | null, record: StoredRecord<V>, value: V): StorageWrite {
  if (!storage) return 'blocked';
  try {
    storage.setItem(record.key, JSON.stringify({ version: record.version, ...record.write(value) }));
    return 'ok';
  } catch (error) {
    return isQuotaError(error) ? 'full' : 'blocked';
  }
}

export function removeRecord(storage: KeyValueStorage | null, record: Pick<StoredRecord<unknown>, 'key'>): void {
  try {
    storage?.removeItem(record.key);
  } catch {
    // blocked: nothing was kept to remove
  }
}

/** The version a record was stored with; 0 for none (an older app's format); null for a broken one. */
function storedVersion(data: unknown): number | null {
  if (typeof data !== 'object' || data === null || Array.isArray(data) || !('version' in data)) return 0;
  const { version } = data;
  return typeof version === 'number' && Number.isInteger(version) && version >= 1 ? version : null;
}

/** The quota is spent. Firefox has a name of its own. */
function isQuotaError(error: unknown): boolean {
  return error instanceof DOMException && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED');
}
