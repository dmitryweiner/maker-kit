// Rasters a worker gets from the main thread: a coverage mask (a text drawn
// by `ui/textRaster`) and a picture's field. Marching squares trace a mask
// into polygons for a cross-section; a field is sampled bilinearly between
// its pixel centres. No DOM: workers import it.
//
// Contour coordinates are pixels with y up: pixel (i, j) of row j from the
// top has its centre at (i + 0.5, height − j − 0.5).

export type Point2 = [number, number];
export type Ring = Point2[];

/** Coverage 0–255 per pixel, row 0 at the top. */
export interface Mask {
  width: number;
  height: number;
  data: Uint8Array;
}

/** A text block drawn by the main thread (`ui/textRaster`). */
export interface TextRaster extends Mask {
  pxPerMm: number;
  /** the capital letter height as drawn, mm */
  cap: number;
  /**
   * The block's origin in the raster, px from the left and from the top:
   * the middle of the widest line, and either the block's middle (between
   * the first line's cap top and the last baseline) or the first baseline.
   */
  originX: number;
  originY: number;
}

/** A raster side's limit: a bigger block is drawn coarser (`rasterScale`). */
export const MAX_RASTER_PX = 4096;

const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

/** Checks a text raster that came from outside (a worker message): the shape must add up. */
export function isTextRaster(value: unknown): value is TextRaster {
  if (typeof value !== 'object' || value === null) return false;
  const v: Record<string, unknown> = Object.fromEntries(Object.entries(value));
  const { width, height, data, pxPerMm, cap, originX, originY } = v;
  return (
    isNumber(width) &&
    isNumber(height) &&
    Number.isInteger(width) &&
    Number.isInteger(height) &&
    width >= 1 &&
    height >= 1 &&
    width <= MAX_RASTER_PX &&
    height <= MAX_RASTER_PX &&
    isNumber(pxPerMm) &&
    pxPerMm > 0 &&
    isNumber(cap) &&
    isNumber(originX) &&
    isNumber(originY) &&
    data instanceof Uint8Array &&
    data.length === width * height
  );
}

/** The level a contour follows: half coverage. */
export const LEVEL = 127.5;

/** A padded grid node's coordinate in pixels (the padding's nodes lie half a pixel out). */
const node = (k: number): number => k - 0.5;

/**
 * An anti-aliased mask → polygons at the 50 % level, with linear
 * interpolation along cell edges, so the contours are smooth and sub-pixel
 * accurate. Holes are kept; outer rings come out counter-clockwise and holes
 * clockwise (y up), so a cross-section takes them with the nonzero rule.
 * Then simplified within `tolerance` px.
 */
export function traceContours(mask: Mask, tolerance = 0.25): Ring[] {
  const { width, height, data } = mask;
  // the grid of pixel centres, padded with a ring of empty ones so every contour closes
  const gw = width + 2;
  const gh = height + 2;
  const value = (i: number, j: number): number => {
    // i, j: padded grid, j counted from the bottom
    const x = i - 1;
    const row = height - j;
    if (x < 0 || x >= width || row < 0 || row >= height) return 0;
    return data[row * width + x]!;
  };

  // A crossing on an edge, by the edge's id: horizontal edges from node (i, j) to (i + 1, j),
  // vertical from (i, j) to (i, j + 1).
  const hEdge = (i: number, j: number): number => (j * gw + i) * 2;
  const vEdge = (i: number, j: number): number => (j * gw + i) * 2 + 1;
  const crossing = (edge: number): Point2 => {
    const at = edge >> 1;
    const i = at % gw;
    const j = (at - i) / gw;
    const [i1, j1] = edge & 1 ? [i, j + 1] : [i + 1, j];
    const v0 = value(i, j);
    const v1 = value(i1, j1);
    const t = (LEVEL - v0) / (v1 - v0);
    return [node(i) + t * (i1 - i), node(j) + t * (j1 - j)];
  };

  /** segment start edge → end edge; inside lies on the left of each */
  const next = new Map<number, number>();
  for (let j = 0; j < gh - 1; j++) {
    for (let i = 0; i < gw - 1; i++) {
      const a = value(i, j) > LEVEL; // bottom left
      const b = value(i + 1, j) > LEVEL; // bottom right
      const c = value(i + 1, j + 1) > LEVEL; // top right
      const d = value(i, j + 1) > LEVEL; // top left
      if (a === b && b === c && c === d) continue;
      // the cell's edges counter-clockwise, each from its first corner to its second
      const edges: [number, boolean, boolean][] = [
        [hEdge(i, j), a, b],
        [vEdge(i + 1, j), b, c],
        [hEdge(i, j + 1), c, d],
        [vEdge(i, j), d, a],
      ];
      // a segment runs from where the boundary leaves the inside to where it comes back:
      // an isolated inside corner lies between an entering edge and the leaving one after it
      // (counter-clockwise); in a saddle whose centre is inside, the two inside corners join
      // and each leaving edge goes on to the entering edge after it
      const saddle = edges.filter(([, from, to]) => from !== to).length === 4;
      const centre = (value(i, j) + value(i + 1, j) + value(i + 1, j + 1) + value(i, j + 1)) / 4 > LEVEL;
      const step = saddle && centre ? 1 : 3;
      edges.forEach(([edge, from, to], k) => {
        if (!from || to) return;
        if (!saddle) {
          const entering = edges.find(([, f, t]) => !f && t);
          if (entering) next.set(edge, entering[0]);
          return;
        }
        next.set(edge, edges[(k + step) % 4]![0]);
      });
    }
  }

  const rings: Ring[] = [];
  const seen = new Set<number>();
  for (const start of next.keys()) {
    if (seen.has(start)) continue;
    const ring: Ring = [];
    let edge: number | undefined = start;
    while (edge !== undefined && !seen.has(edge)) {
      seen.add(edge);
      ring.push(crossing(edge));
      edge = next.get(edge);
    }
    if (ring.length >= 3) rings.push(simplifyRing(ring, tolerance));
  }
  return rings;
}

/** Ramer–Douglas–Peucker on a closed ring: split at the farthest pair, simplify both halves. */
export function simplifyRing(ring: Ring, tolerance: number): Ring {
  if (ring.length <= 3) return ring;
  const first = ring[0]!;
  let far = 0;
  let best = -1;
  for (let k = 1; k < ring.length; k++) {
    const d = Math.hypot(ring[k]![0] - first[0], ring[k]![1] - first[1]);
    if (d > best) {
      best = d;
      far = k;
    }
  }
  const keep = new Uint8Array(ring.length);
  keep[0] = 1;
  keep[far] = 1;
  const stack: [number, number][] = [
    [0, far],
    [far, ring.length],
  ];
  while (stack.length > 0) {
    const [s, e] = stack.pop() ?? [0, 0];
    const a = ring[s]!;
    const b = ring[e % ring.length]!;
    let worst = 0;
    let at = -1;
    for (let k = s + 1; k < e; k++) {
      const d = distanceToLine(ring[k]!, a, b);
      if (d > worst) {
        worst = d;
        at = k;
      }
    }
    if (at >= 0 && worst > tolerance) {
      keep[at] = 1;
      stack.push([s, at], [at, e]);
    }
  }
  const out = ring.filter((_, k) => keep[k] === 1);
  // a ring simplified below a triangle keeps its original shape
  return out.length >= 3 ? out : ring;
}

function distanceToLine(p: Readonly<Point2>, a: Readonly<Point2>, b: Readonly<Point2>): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  if (len < 1e-12) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  return Math.abs((p[0] - a[0]) * dy - (p[1] - a[1]) * dx) / len;
}

/** Twice the signed area of a ring: positive when counter-clockwise (y up). */
export function ringArea(ring: Ring): number {
  let sum = 0;
  for (let k = 0; k < ring.length; k++) {
    const [x0, y0] = ring[k]!;
    const [x1, y1] = ring[(k + 1) % ring.length]!;
    sum += x0 * y1 - x1 * y0;
  }
  return sum / 2;
}

/**
 * A field of `pw × ph` pixels (row 0 at the top) spread over `w × h` mm
 * around the origin, y up, at the point (x, y): bilinear between pixel
 * centres, the edge pixel held out to the picture's border, 0 outside it.
 */
export function sampleField(field: ArrayLike<number>, pw: number, ph: number, w: number, h: number, x: number, y: number): number {
  if (x < -w / 2 || x > w / 2 || y < -h / 2 || y > h / 2) return 0;
  // pixel coordinates with centres at whole numbers
  const u = Math.min(pw - 1, Math.max(0, ((x + w / 2) / w) * pw - 0.5));
  const v = Math.min(ph - 1, Math.max(0, ((h / 2 - y) / h) * ph - 0.5));
  const i0 = Math.floor(u);
  const j0 = Math.floor(v);
  const i1 = Math.min(pw - 1, i0 + 1);
  const j1 = Math.min(ph - 1, j0 + 1);
  const fu = u - i0;
  const fv = v - j0;
  const top = field[j0 * pw + i0]! * (1 - fu) + field[j0 * pw + i1]! * fu;
  const bottom = field[j1 * pw + i0]! * (1 - fu) + field[j1 * pw + i1]! * fu;
  return top * (1 - fv) + bottom * fv;
}
