import { describe, expect, it } from 'vitest';
import { greet, label, roundTrip, t } from './use';

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

  it('checks and traces a text raster, builds a heightfield, fits a picture', () => {
    // a 3 × 3 heightfield of 4 × 2 cells: 16 top triangles, 12 boundary edges of 3 each
    expect(label()).toEqual({ rings: 1, solid: 16 + 12 * 3, kept: [256, 128] });
  });
});
