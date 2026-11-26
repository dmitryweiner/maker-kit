// A text block → its raster: drawn by the browser with the app's font at
// 10 px/mm, the letter size given as the capital height and measured from
// the font, lines laid out here, Hebrew shaped right to left. A worker
// traces it (`core/raster` `traceContours`) or samples it as a relief. The
// block's geometry is pure and tested; the drawing needs a canvas (the apps'
// smokes check it).

import type { TextRaster } from '../core/raster';
import { MAX_RASTER_PX } from '../core/raster';
import type { FontSpec } from './fonts';

export const PX_PER_MM = 10;

/** px/mm for a block of this many mm: 10, or less so that no side passes the limit. */
export function rasterScale(widthMm: number, heightMm: number): number {
  return Math.min(PX_PER_MM, MAX_RASTER_PX / Math.max(widthMm, heightMm, 1e-6));
}

export function hasRtl(line: string): boolean {
  return /[֐-׿יִ-ﭏ]/.test(line);
}

export type Align = 'left' | 'center' | 'right';

/**
 * Where a block's origin is: `middle` — the widest line's middle, halfway
 * between the first line's cap top and the last baseline (a label, a
 * text on a wall); `baseline` — the widest line's middle on the first
 * baseline (a strip bent onto an arc).
 */
export type Origin = 'middle' | 'baseline';

/** Each line's offset from the block's middle to its left end, for widths laid out by `align`. */
export function lineOffsets(widths: readonly number[], align: Align): number[] {
  const block = Math.max(0, ...widths);
  return widths.map((w) => (align === 'left' ? -block / 2 : align === 'right' ? block / 2 - w : -w / 2));
}

export interface BlockMetrics {
  /** capital height, px */
  cap: number;
  /** baseline to baseline, px */
  advance: number;
  /** the tallest ink above / the deepest below a baseline, px */
  ascent: number;
  descent: number;
  /** room around the ink, px */
  pad: number;
  align: Align;
  origin: Origin;
}

export interface BlockGeometry {
  width: number;
  height: number;
  /** each line's left end and baseline, px in the raster */
  lefts: number[];
  baselines: number[];
  originX: number;
  originY: number;
}

/** Where the lines go in the raster and where the block's origin is. */
export function blockGeometry(widths: readonly number[], m: BlockMetrics): BlockGeometry {
  const widest = Math.max(0, ...widths);
  const n = Math.max(1, widths.length);
  const firstBaseline = m.pad + m.ascent;
  const baselines = Array.from({ length: n }, (_, k) => firstBaseline + k * m.advance);
  const lastBaseline = firstBaseline + (n - 1) * m.advance;
  const originX = m.pad + widest / 2;
  return {
    width: Math.ceil(widest + 2 * m.pad),
    height: Math.ceil(lastBaseline + m.descent + m.pad),
    lefts: lineOffsets(widths, m.align).map((x) => originX + x),
    baselines,
    originX,
    originY: m.origin === 'baseline' ? firstBaseline : (firstBaseline - m.cap + lastBaseline) / 2,
  };
}

export interface TextBlock {
  /** the lines as drawn, top to bottom; a block of blank lines draws nothing */
  lines: readonly string[];
  /** the capital letter height, mm */
  capMm: number;
  font: FontSpec;
  /** baseline to baseline in capital heights; 1.6 by default */
  lineSpacing?: number;
  align?: Align;
  origin?: Origin;
  /**
   * Room around the ink, px; a third of the font size by default (scripts
   * overhang their advance). A glyph's own overhang widens it anyway.
   */
  padPx?: number;
}

/**
 * Draws a block: coverage 0–255, row 0 at the top. Null without a canvas or
 * with nothing to draw. A block too big for the raster limit is drawn at
 * fewer px/mm (`pxPerMm` says how many).
 */
export function rasterizeText(block: TextBlock, doc: Document = document): TextRaster | null {
  const ctx = doc.createElement('canvas').getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  const { lines } = block;
  if (lines.every((line) => line.trim() === '')) return null;
  const css = (px: number): string => `${block.font.weight} ${px}px "${block.font.family}"`;

  // the capital height of this font, as a share of its size
  const reference = 100;
  ctx.font = css(reference);
  const capRatio = ctx.measureText('H').actualBoundingBoxAscent / reference || 0.7;

  const measure = (pxPerMm: number): { fontPx: number; geometry: BlockGeometry } => {
    const fontPx = (block.capMm * pxPerMm) / capRatio;
    ctx.font = css(fontPx);
    const metrics = lines.map((line) => {
      ctx.direction = hasRtl(line) ? 'rtl' : 'ltr';
      return ctx.measureText(line);
    });
    // a glyph may reach out of its advance (an italic, a swash): the room grows to hold it
    const overhang = Math.max(0, ...metrics.map((m) => Math.max(m.actualBoundingBoxLeft, m.actualBoundingBoxRight - m.width)));
    const geometry = blockGeometry(
      metrics.map((m) => m.width),
      {
        cap: block.capMm * pxPerMm,
        advance: block.capMm * (block.lineSpacing ?? 1.6) * pxPerMm,
        ascent: Math.max(block.capMm * pxPerMm, ...metrics.map((m) => m.actualBoundingBoxAscent)),
        descent: Math.max(0, ...metrics.map((m) => m.actualBoundingBoxDescent)),
        pad: Math.ceil(Math.max(block.padPx ?? fontPx / 3, overhang + 1)),
        align: block.align ?? 'center',
        origin: block.origin ?? 'middle',
      },
    );
    return { fontPx, geometry };
  };

  let pxPerMm = PX_PER_MM;
  let { fontPx, geometry } = measure(pxPerMm);
  if (geometry.width > MAX_RASTER_PX || geometry.height > MAX_RASTER_PX) {
    pxPerMm = rasterScale(geometry.width / pxPerMm, geometry.height / pxPerMm);
    ({ fontPx, geometry } = measure(pxPerMm));
  }

  ctx.canvas.width = Math.min(MAX_RASTER_PX, geometry.width);
  ctx.canvas.height = Math.min(MAX_RASTER_PX, geometry.height);
  ctx.font = css(fontPx);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  lines.forEach((line, k) => {
    ctx.direction = hasRtl(line) ? 'rtl' : 'ltr';
    ctx.fillText(line, geometry.lefts[k] ?? 0, geometry.baselines[k] ?? 0);
  });
  const { width, height } = ctx.canvas;
  const rgba = ctx.getImageData(0, 0, width, height).data;
  const data = new Uint8Array(width * height);
  for (let i = 0; i < data.length; i++) data[i] = rgba[i * 4 + 3]!;
  return { width, height, data, pxPerMm, cap: block.capMm, originX: geometry.originX, originY: geometry.originY };
}
