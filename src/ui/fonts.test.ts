import { describe, expect, it } from 'vitest';
import type { FontEnv, FontFile } from './fonts';
import { createFontLoader, SUBSET_RANGES } from './fonts';

type Id = 'rubik' | 'oswald';

const FILES: Record<Id, FontFile> = {
  rubik: { family: 'app-rubik', label: 'Rubik', file: 'rubik', weight: '700', subsets: ['latin', 'cyrillic', 'hebrew'] },
  oswald: { family: 'app-oswald', label: 'Oswald', file: 'oswald', weight: '600', subsets: ['latin', 'cyrillic'] },
};

interface Made {
  family: string;
  source: string;
  descriptors: FontFaceDescriptors;
  settle: (ok: boolean) => void;
}

/** A fake font API: each face loads when the test settles it. */
function fakeEnv() {
  const made: Made[] = [];
  const added: string[] = [];
  const env: FontEnv = {
    make(family, source, descriptors) {
      const pending: { ok: (face: unknown) => void; fail: (error: Error) => void } = { ok: () => {}, fail: () => {} };
      const face = {
        family,
        source,
        load: () =>
          new Promise((resolve, reject) => {
            pending.ok = resolve;
            pending.fail = reject;
          }),
      };
      made.push({
        family,
        source,
        descriptors,
        settle: (ok) => (ok ? pending.ok(face) : pending.fail(new Error('404'))),
      });
      // a test double: only `load` and the identity matter to the loader
      return face as unknown as FontFace;
    },
    add(face) {
      added.push((face as unknown as { source: string }).source);
    },
  };
  return { env, made, added };
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('createFontLoader', () => {
  it('loads every subset of a font from the folder, with its range and weight', async () => {
    const { env, made, added } = fakeEnv();
    const fonts = createFontLoader(FILES, '/app/fonts/', env);
    const done = fonts.load('oswald');
    expect(made.map((m) => m.source)).toEqual([
      "url(/app/fonts/oswald-latin.woff2) format('woff2')",
      "url(/app/fonts/oswald-cyrillic.woff2) format('woff2')",
    ]);
    expect(made[1]?.descriptors).toEqual({ weight: '600', unicodeRange: SUBSET_RANGES.cyrillic });
    expect(made.every((m) => m.family === 'app-oswald')).toBe(true);
    expect(fonts.ready('oswald')).toBe(false);
    for (const m of made) m.settle(true);
    await done;
    expect(fonts.ready('oswald')).toBe(true);
    expect(added).toHaveLength(2);
  });

  it('loads a font once a session', () => {
    const { env, made } = fakeEnv();
    const fonts = createFontLoader(FILES, '/', env);
    expect(fonts.load('rubik')).toBe(fonts.load('rubik'));
    expect(made).toHaveLength(3);
  });

  it('tries again after a failure', async () => {
    const { env, made } = fakeEnv();
    const fonts = createFontLoader(FILES, '/', env);
    const first = fonts.load('oswald');
    made[0]?.settle(false);
    await expect(first).rejects.toThrow('404');
    expect(fonts.ready('oswald')).toBe(false);
    void fonts.load('oswald');
    expect(made).toHaveLength(4);
  });

  it('ensure: true when ready; otherwise starts the load once and calls back the one that started it', async () => {
    const { env, made } = fakeEnv();
    const fonts = createFontLoader(FILES, '/', env);
    const calls: string[] = [];
    expect(fonts.ensure('oswald', () => calls.push('first'))).toBe(false);
    expect(fonts.ensure('oswald', () => calls.push('second'))).toBe(false);
    expect(made).toHaveLength(2);
    for (const m of made) m.settle(true);
    await tick();
    expect(calls).toEqual(['first']);
    expect(fonts.ensure('oswald', () => calls.push('third'))).toBe(true);
    expect(calls).toEqual(['first']);
  });

  it('ensure: a failed load calls nobody back, and the next ensure tries again', async () => {
    const { env, made } = fakeEnv();
    const fonts = createFontLoader(FILES, '/', env);
    const calls: string[] = [];
    fonts.ensure('oswald', () => calls.push('first'));
    made[0]?.settle(false);
    await tick();
    expect(calls).toEqual([]);
    fonts.ensure('oswald', () => calls.push('again'));
    expect(made).toHaveLength(4);
  });
});
