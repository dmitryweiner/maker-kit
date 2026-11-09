import { describe, expect, it } from 'vitest';
import { format, placeholders } from './format';

describe('format', () => {
  it('substitutes parameters and leaves an unknown one as it is', () => {
    expect(format('{name}: {w} × {h} mm', { name: 'Lid', w: 60, h: 40 }, 'en')).toBe('Lid: 60 × 40 mm');
    expect(format('Hello {who}', undefined, 'en')).toBe('Hello {who}');
    expect(format('no params', { n: 1 }, 'en')).toBe('no params');
  });

  it.each([
    [1, '1 file'],
    [2, '2 files'],
    [0, '0 files'],
  ])('English plurals: %i', (n, text) => {
    expect(format('{n} {n|file|files}', { n }, 'en')).toBe(text);
  });

  it.each([
    [1, 'винт'],
    [3, 'винта'],
    [5, 'винтов'],
    [21, 'винт'],
    [22, 'винта'],
    [11, 'винтов'],
  ])('Russian plurals in the order one, few, many: %i', (n, word) => {
    expect(format('{n|винт|винта|винтов}', { n }, 'ru')).toBe(word);
  });

  it('a fraction in Russian takes the last form given', () => {
    expect(format('{n|винт|винта|винтов}', { n: 1.5 }, 'ru')).toBe('винтов');
  });

  it.each([
    [1, 'בורג'],
    [2, 'שני ברגים'],
    [5, 'ברגים'],
  ])('Hebrew plurals in the order one, two, other: %i', (n, word) => {
    expect(format('{n|בורג|שני ברגים|ברגים}', { n }, 'he')).toBe(word);
  });

  it('Ukrainian plurals as Russian', () => {
    expect([1, 2, 5].map((n) => format('{n|гвинт|гвинти|гвинтів}', { n }, 'uk'))).toEqual(['гвинт', 'гвинти', 'гвинтів']);
  });

  it('takes a region in the locale', () => {
    expect(format('{n|file|files}', { n: 1 }, 'en-GB')).toBe('file');
  });
});

describe('placeholders', () => {
  it('lists the parameter names, sorted, plural ones included', () => {
    expect(placeholders('{w} × {h}, {n|screw|screws}')).toEqual(['h', 'n', 'w']);
    expect(placeholders('none')).toEqual([]);
    expect(placeholders('{n} {n|screw|screws}')).toEqual(['n']);
  });
});
