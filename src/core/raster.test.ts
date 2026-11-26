import { describe, expect, it } from 'vitest';
import type { Mask } from './raster';
import { isTextRaster, MAX_RASTER_PX, ringArea, sampleField, simplifyRing, traceContours } from './raster';

/** A mask from a function of the pixel centre (x right, y down, in px). */
function mask(width: number, height: number, value: (x: number, y: number) => number): Mask {
  const data = new Uint8Array(width * height);
  for (let j = 0; j < height; j++)
    for (let i = 0; i < width; i++) data[j * width + i] = Math.max(0, Math.min(255, Math.round(value(i + 0.5, j + 0.5))));
  return { width, height, data };
}

/** An anti-aliased disc: coverage falls from 255 to 0 across one pixel at radius r. */
const disc = (cx: number, cy: number, r: number) => (x: number, y: number) =>
  255 * Math.min(1, Math.max(0, r - Math.hypot(x - cx, y - cy) + 0.5));

const annulus = (x: number, y: number) => Math.min(disc(32, 32, 20)(x, y), 255 - disc(32, 32, 10)(x, y));

describe('traceContours', () => {
  it('traces a disc as one counter-clockwise ring of area πr²', () => {
    const rings = traceContours(mask(64, 64, disc(32, 32, 20)));
    expect(rings).toHaveLength(1);
    const area = ringArea(rings[0] ?? []);
    expect(area).toBeGreaterThan(0);
    // chords within a quarter pixel cut a little off a convex shape
    expect(Math.abs(area / (Math.PI * 400) - 1)).toBeLessThan(0.01);
  });

  it('keeps the hole of a ring, clockwise', () => {
    const rings = traceContours(mask(64, 64, annulus));
    expect(rings).toHaveLength(2);
    const areas = rings.map(ringArea).toSorted((a, b) => a - b);
    expect(areas[0]).toBeLessThan(0);
    expect(-(areas[0] ?? 0) / (Math.PI * 100)).toBeCloseTo(1, 1);
    expect(Math.abs((areas[1] ?? 0) / (Math.PI * 400) - 1)).toBeLessThan(0.01);
  });

  it('closes a shape that touches the edge of the raster', () => {
    const rings = traceContours(mask(10, 10, () => 255));
    expect(rings).toHaveLength(1);
    // the contour runs half a pixel out of the edge pixels' centres, on the padding; each corner is cut by ⅛ px²
    expect(ringArea(rings[0] ?? [])).toBeCloseTo(100 - 4 / 8, 6);
  });

  it('keeps a checkerboard’s squares apart, all counter-clockwise', () => {
    const board = mask(4, 4, (x, y) => ((Math.floor(x) + Math.floor(y)) % 2 === 0 ? 255 : 0));
    const rings = traceContours(board);
    expect(rings.length).toBeGreaterThan(0);
    const total = rings.reduce((sum, r) => sum + ringArea(r), 0);
    // eight lit pixels, each a diamond of area ½ between the 50 % crossings
    expect(total).toBeCloseTo(8 * 0.5, 6);
  });

  it('places a soft edge where it crosses 50 %, between pixels', () => {
    // a vertical edge: columns 0–4 full, column 5 at 75 %, the rest empty
    const edge = mask(10, 4, (x) => (x < 5 ? 255 : x < 6 ? 191 : 0));
    const xs = (traceContours(edge)[0] ?? []).map((p) => p[0]);
    // the 50 % crossing between centres 5.5 (75 %) and 6.5 (0) is at 5.5 + 0.25 / 0.75
    expect(Math.max(...xs)).toBeCloseTo(5.5 + (191 - 127.5) / 191, 2);
  });

  it('gives y up: the top row of the raster has the largest y', () => {
    const top = mask(4, 4, (_, y) => (y < 1 ? 255 : 0));
    const ys = (traceContours(top)[0] ?? []).map((p) => p[1]);
    expect(Math.min(...ys)).toBeGreaterThan(2);
  });

  it('finds nothing in an empty mask', () => {
    expect(traceContours(mask(5, 5, () => 0))).toEqual([]);
  });
});

describe('simplifyRing', () => {
  it('drops points that stray less than the tolerance from the line', () => {
    const ring: [number, number][] = [
      [0, 0],
      [1, 0.01],
      [2, 0],
      [2, 2],
      [1, 2.01],
      [0, 2],
    ];
    expect(simplifyRing(ring, 0.05)).toHaveLength(4);
    expect(simplifyRing(ring, 0.001)).toHaveLength(6);
  });

  it('keeps a small triangle a triangle', () => {
    const ring: [number, number][] = [
      [0, 0],
      [0.1, 0],
      [0, 0.1],
    ];
    expect(simplifyRing(ring, 1)).toHaveLength(3);
  });
});

describe('ringArea', () => {
  it('is positive counter-clockwise and negative clockwise', () => {
    const square: [number, number][] = [
      [0, 0],
      [2, 0],
      [2, 2],
      [0, 2],
    ];
    expect(ringArea(square)).toBe(4);
    expect(ringArea(square.toReversed())).toBe(-4);
  });
});

describe('sampleField', () => {
  // a 2 × 1 picture 20 × 10 mm: pixel centres at x = −5 and +5
  const field = new Float32Array([0, 1]);
  const at = (x: number, y: number) => sampleField(field, 2, 1, 20, 10, x, y);

  it('is bilinear between pixel centres', () => {
    expect(at(-5, 0)).toBeCloseTo(0);
    expect(at(0, 0)).toBeCloseTo(0.5);
    expect(at(2.5, 3)).toBeCloseTo(0.75);
  });

  it('holds the edge pixel out to the picture border and is 0 outside it', () => {
    expect(at(9.9, 4.9)).toBeCloseTo(1);
    expect(at(10.1, 0)).toBe(0);
    expect(at(0, -5.1)).toBe(0);
  });

  it('puts row 0 at the top (y up)', () => {
    const tall = new Float32Array([1, 0]);
    expect(sampleField(tall, 1, 2, 10, 20, 0, 5)).toBeCloseTo(1);
    expect(sampleField(tall, 1, 2, 10, 20, 0, -5)).toBeCloseTo(0);
  });

  it('takes bytes as well as floats', () => {
    expect(sampleField(new Uint8Array([0, 255]), 2, 1, 20, 10, 0, 0)).toBeCloseTo(127.5);
  });
});

describe('isTextRaster', () => {
  const good = { width: 3, height: 2, data: new Uint8Array(6), pxPerMm: 10, cap: 5, originX: 1.5, originY: 1 };

  it('takes a whole raster', () => {
    expect(isTextRaster(good)).toBe(true);
  });

  it('refuses a raster whose parts do not add up', () => {
    for (const bad of [
      null,
      'raster',
      { ...good, data: new Uint8Array(5) },
      { ...good, data: [0, 0, 0, 0, 0, 0] },
      { ...good, width: 2.5 },
      { ...good, width: 0 },
      { ...good, height: MAX_RASTER_PX + 1, data: new Uint8Array(3 * (MAX_RASTER_PX + 1)) },
      { ...good, pxPerMm: 0 },
      { ...good, cap: Number.NaN },
      { ...good, originY: undefined },
    ]) {
      expect(isTextRaster(bad)).toBe(false);
    }
  });
});
