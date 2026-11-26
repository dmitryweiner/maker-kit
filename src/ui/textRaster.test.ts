import { describe, expect, it } from 'vitest';
import { MAX_RASTER_PX } from '../core/raster';
import { blockGeometry, hasRtl, lineOffsets, PX_PER_MM, rasterizeText, rasterScale } from './textRaster';

const metrics = { cap: 7, advance: 12, ascent: 8, descent: 3, pad: 2 };

describe('blockGeometry', () => {
  it('stacks lines by the advance and aligns them within the widest', () => {
    const g = blockGeometry([10, 30], { ...metrics, align: 'right', origin: 'middle' });
    // the block: 30 wide plus the padding; the first baseline under the ascent and padding
    expect(g.width).toBe(34);
    expect(g.baselines).toEqual([10, 22]);
    expect(g.lefts).toEqual([22, 2]);
    expect(g.height).toBe(10 + 12 + 3 + 2);
  });

  it('centres a block between its first cap top and its last baseline', () => {
    const g = blockGeometry([10, 30], { ...metrics, align: 'center', origin: 'middle' });
    expect(g.originX).toBe(17);
    // cap top of line 1 at 10 − 7 = 3, last baseline at 22
    expect(g.originY).toBe((3 + 22) / 2);
    expect(g.lefts).toEqual([12, 2]);
  });

  it('puts a strip’s origin in its middle on the baseline', () => {
    const g = blockGeometry([30], { ...metrics, align: 'left', origin: 'baseline' });
    expect([g.originX, g.originY]).toEqual([17, 10]);
  });
});

describe('lineOffsets', () => {
  it('lays lines out from the block’s middle', () => {
    expect(lineOffsets([10, 30], 'left')).toEqual([-15, -15]);
    expect(lineOffsets([10, 30], 'center')).toEqual([-5, -15]);
    expect(lineOffsets([10, 30], 'right')).toEqual([5, -15]);
  });
});

describe('rasterScale', () => {
  it('is 10 px/mm unless a side would pass the limit', () => {
    expect(rasterScale(50, 20)).toBe(10);
    expect(rasterScale(800, 20)).toBeCloseTo(MAX_RASTER_PX / 800);
  });
});

describe('hasRtl', () => {
  it('finds Hebrew letters', () => {
    expect(hasRtl('שלום')).toBe(true);
    expect(hasRtl('Dom 12')).toBe(false);
    expect(hasRtl('בית 5')).toBe(true);
  });
});

interface Drawn {
  text: string;
  x: number;
  y: number;
  font: string;
  direction: string;
}

/**
 * A canvas stand-in: a glyph is half the font size wide, its ink 0.7 of the
 * size above the baseline and 0.2 below; every pixel it reads back is
 * covered by a quarter.
 */
function fakeDocument(withContext = true) {
  const drawn: Drawn[] = [];
  const ctx = {
    font: '',
    direction: 'ltr',
    fillStyle: '',
    textAlign: '',
    textBaseline: '',
    canvas: { width: 0, height: 0 },
    measureText(text: string) {
      const size = Number.parseFloat(this.font.split(' ')[1] ?? '0');
      const width = text.length * size * 0.5;
      return {
        width,
        actualBoundingBoxAscent: size * 0.7,
        actualBoundingBoxDescent: size * 0.2,
        actualBoundingBoxLeft: 0,
        actualBoundingBoxRight: width,
      };
    },
    fillText(text: string, x: number, y: number) {
      drawn.push({ text, x, y, font: this.font, direction: this.direction });
    },
    getImageData(_x: number, _y: number, w: number, h: number) {
      const data = new Uint8ClampedArray(w * h * 4);
      for (let i = 3; i < data.length; i += 4) data[i] = 64;
      return { data };
    },
  };
  // a test double: rasterizeText only creates a canvas and asks it for a context
  const doc = { createElement: () => ({ getContext: () => (withContext ? ctx : null) }) } as unknown as Document;
  return { doc, ctx, drawn };
}

const font = { family: 'app-rubik', weight: '700' };

describe('rasterizeText', () => {
  it('sizes the font so its capital is the block’s, at 10 px/mm', () => {
    const { doc, drawn } = fakeDocument();
    const raster = rasterizeText({ lines: ['AB'], capMm: 7, font }, doc);
    // the capital is 0.7 of the size: 7 mm × 10 px/mm ÷ 0.7
    expect(drawn[0]?.font).toBe('700 100px "app-rubik"');
    expect(raster?.pxPerMm).toBe(PX_PER_MM);
    expect(raster?.cap).toBe(7);
  });

  it('gives coverage from the alpha channel, one byte a pixel', () => {
    const { doc } = fakeDocument();
    const raster = rasterizeText({ lines: ['A'], capMm: 3, font }, doc);
    expect(raster).not.toBeNull();
    expect(raster?.data.length).toBe((raster?.width ?? 0) * (raster?.height ?? 0));
    expect(raster?.data.every((v) => v === 64)).toBe(true);
  });

  it('centres the lines by default and keeps the room asked for', () => {
    const { doc, drawn } = fakeDocument();
    const raster = rasterizeText({ lines: ['AAAA', 'AA'], capMm: 7, font, padPx: 2 }, doc);
    // 100 px font: lines 200 and 100 px wide
    expect(raster?.width).toBe(204);
    expect(drawn.map((d) => d.x)).toEqual([2, 52]);
    expect(raster?.originX).toBe(102);
    // the second baseline 1.6 capitals under the first
    expect((drawn[1]?.y ?? 0) - (drawn[0]?.y ?? 0)).toBeCloseTo(7 * 1.6 * 10);
  });

  it('draws a Hebrew line right to left', () => {
    const { doc, drawn } = fakeDocument();
    rasterizeText({ lines: ['שלום', 'Dom'], capMm: 5, font }, doc);
    expect(drawn.map((d) => d.direction)).toEqual(['rtl', 'ltr']);
  });

  it('draws a long block coarser, within the raster limit', () => {
    const { doc } = fakeDocument();
    const raster = rasterizeText({ lines: ['A'.repeat(120)], capMm: 10, font }, doc);
    expect(raster?.width).toBeLessThanOrEqual(MAX_RASTER_PX);
    expect(raster?.pxPerMm).toBeLessThan(PX_PER_MM);
  });

  it('draws nothing for blank lines or without a canvas', () => {
    expect(rasterizeText({ lines: ['', '  '], capMm: 5, font }, fakeDocument().doc)).toBeNull();
    expect(rasterizeText({ lines: ['A'], capMm: 5, font }, fakeDocument(false).doc)).toBeNull();
  });
});
