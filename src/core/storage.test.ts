import { describe, expect, it } from 'vitest';
import { browserStorage, loadRecord, removeRecord, saveRecord, type KeyValueStorage, type StoredRecord } from './storage';

class MemoryStorage implements KeyValueStorage {
  data = new Map<string, string>();
  /** a value longer than this is refused as a full storage would */
  constructor(private readonly quota = Infinity) {}
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    if (value.length > this.quota) throw new DOMException('full', 'QuotaExceededError');
    this.data.set(key, value);
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
}

const throwing = (error: unknown): KeyValueStorage => ({
  getItem: () => {
    throw error;
  },
  setItem: () => {
    throw error;
  },
  removeItem: () => {
    throw error;
  },
});
const denied = throwing(new DOMException('denied', 'SecurityError'));

interface Settings {
  locale: string | null;
  count: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

/** Version 2 keeps `{ settings: { locale, count } }`; version 1 kept `{ lang }` alone. */
const settings: StoredRecord<Settings> = {
  key: 'test-app',
  version: 2,
  write: (value) => ({ settings: value }),
  read(data, version) {
    if (!isRecord(data)) return null;
    if (version === 1) return { locale: typeof data.lang === 'string' ? data.lang : null, count: 0 };
    if (!isRecord(data.settings)) return null;
    const { locale, count } = data.settings;
    return {
      locale: typeof locale === 'string' ? locale : null,
      count: typeof count === 'number' && Number.isInteger(count) && count >= 0 ? count : 0,
    };
  },
};

describe('saveRecord and loadRecord', () => {
  it('round-trip a value under its key, with the version beside its fields', () => {
    const storage = new MemoryStorage();
    expect(saveRecord(storage, settings, { locale: 'he', count: 3 })).toBe('ok');
    expect(JSON.parse(storage.data.get('test-app') ?? '')).toEqual({ version: 2, settings: { locale: 'he', count: 3 } });
    expect(loadRecord(storage, settings)).toEqual({ locale: 'he', count: 3 });
  });

  it('give null for nothing stored, no storage, or storage that throws', () => {
    expect(loadRecord(new MemoryStorage(), settings)).toBeNull();
    expect(loadRecord(null, settings)).toBeNull();
    expect(loadRecord(denied, settings)).toBeNull();
  });

  it('pass an older version to `read`, which migrates it', () => {
    const storage = new MemoryStorage();
    storage.setItem('test-app', JSON.stringify({ version: 1, lang: 'uk' }));
    expect(loadRecord(storage, settings)).toEqual({ locale: 'uk', count: 0 });
  });

  it('pass a value stored without a version as version 0, as it was parsed', () => {
    const presets: StoredRecord<string[]> = {
      key: 'legacy',
      version: 1,
      write: (names) => ({ names }),
      read: (data, version) => (version === 0 && Array.isArray(data) ? data.filter((x) => typeof x === 'string') : null),
    };
    const storage = new MemoryStorage();
    storage.setItem('legacy', JSON.stringify(['a', 3, 'b']));
    expect(loadRecord(storage, presets)).toEqual(['a', 'b']);
  });

  it.each([
    'not json',
    'null',
    '{"version":3,"settings":{"count":1}}',
    '{"version":"2","settings":{}}',
    '{"version":2.5}',
    '{"version":-1}',
  ])('give null for what `read` cannot take or a newer version: %s', (raw) => {
    const storage = new MemoryStorage();
    storage.setItem('test-app', raw);
    expect(loadRecord(storage, settings)).toBeNull();
  });

  it('sanitise through `read`, field by field', () => {
    const storage = new MemoryStorage();
    storage.setItem('test-app', JSON.stringify({ version: 2, settings: { locale: 7, count: -4 } }));
    expect(loadRecord(storage, settings)).toEqual({ locale: null, count: 0 });
  });

  it('give null when `read` throws', () => {
    const storage = new MemoryStorage();
    storage.setItem('test-app', '{"version":2}');
    const brittle: StoredRecord<never> = {
      ...settings,
      write: () => ({}),
      read: () => {
        throw new Error('bug');
      },
    };
    expect(loadRecord(storage, brittle)).toBeNull();
  });

  it.each([
    ['Chrome, Safari', new DOMException('quota', 'QuotaExceededError')],
    ['Firefox', new DOMException('quota', 'NS_ERROR_DOM_QUOTA_REACHED')],
  ])('tell a full storage (%s)', (_, error) => {
    expect(saveRecord(throwing(error), settings, { locale: null, count: 0 })).toBe('full');
    expect(saveRecord(new MemoryStorage(10), settings, { locale: null, count: 0 })).toBe('full');
  });

  it('call any other failure blocked, no storage included', () => {
    expect(saveRecord(denied, settings, { locale: null, count: 0 })).toBe('blocked');
    expect(saveRecord(throwing('weird'), settings, { locale: null, count: 0 })).toBe('blocked');
    expect(saveRecord(null, settings, { locale: null, count: 0 })).toBe('blocked');
  });

  it('keep several records of an app apart', () => {
    const storage = new MemoryStorage();
    const model: StoredRecord<string> = {
      key: 'test-app-model',
      version: 1,
      write: (name) => ({ name }),
      read: (data) => (isRecord(data) && typeof data.name === 'string' ? data.name : null),
    };
    saveRecord(storage, settings, { locale: 'ru', count: 1 });
    saveRecord(storage, model, 'vase');
    expect([loadRecord(storage, settings), loadRecord(storage, model)]).toEqual([{ locale: 'ru', count: 1 }, 'vase']);
  });
});

describe('removeRecord', () => {
  it('removes the record and never throws', () => {
    const storage = new MemoryStorage();
    saveRecord(storage, settings, { locale: null, count: 1 });
    removeRecord(storage, settings);
    expect(loadRecord(storage, settings)).toBeNull();
    expect(() => removeRecord(denied, settings)).not.toThrow();
    expect(() => removeRecord(null, settings)).not.toThrow();
  });
});

describe('browserStorage', () => {
  it('is null where there is no localStorage', () => {
    expect(browserStorage()).toBeNull();
  });
});
