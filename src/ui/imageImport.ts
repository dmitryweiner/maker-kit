// A picture file → gray and alpha, box-averaged down to a size an app keeps
// (a plate's relief, a vessel's ornament). The pure conversions are tested
// in node; the browser glue at the end decodes a file through an <img>, so
// an SVG's scripts never run.

/** The largest file taken in. */
export const MAX_FILE_BYTES = 20 * 1024 * 1024;

/** A picture as gray and alpha, interleaved, row 0 at the top. */
export interface GrayAlpha {
  width: number;
  height: number;
  /** width · height · 2 bytes: gray, alpha */
  data: Uint8Array;
}

/** The kept size: the long side within `max`, the proportions kept, at least 1 px. */
export function fitPixels(width: number, height: number, max: number): [number, number] {
  const long = Math.max(width, height);
  if (long <= max) return [width, height];
  return [Math.max(1, Math.round((width / long) * max)), Math.max(1, Math.round((height / long) * max))];
}

/**
 * Box-averages an RGBA picture down to fit `max`, turning colour into Rec.
 * 601 gray. The gray is weighted by alpha, so a transparent pixel's colour
 * does not bleed into its neighbours; averaging, not sampling, so a thin
 * stroke does not fall between samples but turns gray.
 */
export function downscaleGrayAlpha(rgba: ArrayLike<number>, sw: number, sh: number, max: number): GrayAlpha {
  const [w, h] = fitPixels(sw, sh, max);
  const data = new Uint8Array(w * h * 2);
  for (let j = 0; j < h; j++) {
    const y0 = Math.floor((j * sh) / h);
    const y1 = Math.max(y0 + 1, Math.floor(((j + 1) * sh) / h));
    for (let i = 0; i < w; i++) {
      const x0 = Math.floor((i * sw) / w);
      const x1 = Math.max(x0 + 1, Math.floor(((i + 1) * sw) / w));
      let gray = 0;
      let alpha = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const k = (y * sw + x) * 4;
          const a = rgba[k + 3]!;
          gray += (0.299 * rgba[k]! + 0.587 * rgba[k + 1]! + 0.114 * rgba[k + 2]!) * a;
          alpha += a;
        }
      }
      const count = (y1 - y0) * (x1 - x0);
      data[(j * w + i) * 2] = alpha > 0 ? Math.round(gray / alpha) : 0;
      data[(j * w + i) * 2 + 1] = Math.round(alpha / count);
    }
  }
  return { width: w, height: h, data };
}

/** Gray laid over a background (white: 255): what a viewer shows of a picture with transparency. */
export function flattenGray(picture: GrayAlpha, background: number): Uint8Array {
  const out = new Uint8Array(picture.width * picture.height);
  for (let i = 0; i < out.length; i++) {
    const g = picture.data[i * 2]!;
    const a = picture.data[i * 2 + 1]!;
    out[i] = Math.round((g * a + background * (255 - a)) / 255);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Browser glue: checked by the apps' smokes (jsdom has no canvas).

async function loadImage(url: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.src = url;
  await image.decode();
  return image;
}

/**
 * A file (PNG, JPEG, WebP, GIF's first frame, SVG) → its gray and alpha,
 * the long side within `max`. The browser draws it at most at twice that
 * size, then it is box-averaged down. Throws on a file over
 * `MAX_FILE_BYTES` or one the browser cannot decode.
 */
export async function importImage(file: Blob, max: number): Promise<GrayAlpha> {
  if (file.size > MAX_FILE_BYTES) throw new Error('file too large');
  const url = URL.createObjectURL(file);
  try {
    const image = await loadImage(url);
    // an SVG without its own size reports 0: draw it at the kept size
    const sw = image.naturalWidth || max;
    const sh = image.naturalHeight || max;
    const [dw, dh] = fitPixels(sw, sh, max * 2);
    const canvas = document.createElement('canvas');
    canvas.width = dw;
    canvas.height = dh;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('no 2D canvas');
    ctx.drawImage(image, 0, 0, dw, dh);
    return downscaleGrayAlpha(ctx.getImageData(0, 0, dw, dh).data, dw, dh, max);
  } finally {
    URL.revokeObjectURL(url);
  }
}
