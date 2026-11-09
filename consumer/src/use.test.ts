import { describe, expect, it } from 'vitest';
import { greet, roundTrip, t } from './use';

describe('the kit installed as a package', () => {
  it('runs its TypeScript sources from node_modules', () => {
    expect(greet({ code: 'hello', params: { name: 'kit' } })).toBe('Hello, kit');
    expect(greet({ code: '' })).toBe('');
  });

  it('works with the app’s state, storage and dictionary', () => {
    const data = new Map<string, string>();
    const storage = {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
      removeItem: () => {},
    };
    expect(roundTrip(storage)).toEqual({
      saved: 'ok',
      box: { w: 60 },
      file: 'box.box.json',
      refusal: 'This file is not a project of this app.',
    });
    expect(t('kit.storage.dismiss')).toBe('Dismiss');
  });
});
