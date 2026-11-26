// The fonts an app draws text with (a label, a mark, a plate's text): woff2
// subsets in the app's public folder with their OFL licences, loaded only
// when a text needs them. Never from a CDN: the font must be exactly the
// same on every build, or the letters of a mesh would drift. A text waits
// for its font rather than being drawn with a fallback (the preview would
// jump when the real one arrives).

export type FontSubset = 'latin' | 'cyrillic' | 'hebrew';

/** The subsets' ranges, as Google Fonts cuts them. */
export const SUBSET_RANGES: Readonly<Record<FontSubset, string>> = {
  latin:
    'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, ' +
    'U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
  cyrillic: 'U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116',
  hebrew: 'U+0307-0308, U+0590-05FF, U+200C-2010, U+20AA, U+25CC, U+FB1D-FB4F',
};

export interface FontFile {
  /** the family's name in document.fonts: the app's own, so the page never competes */
  family: string;
  /** the name in a font menu: the font's own, in Latin letters */
  label: string;
  /** `<file>-<subset>.woff2` in the fonts folder */
  file: string;
  weight: string;
  subsets: readonly FontSubset[];
}

/** What a text drawing needs of a font: `ctx.font` is built from these. */
export type FontSpec = Pick<FontFile, 'family' | 'weight'>;

/** The browser's font API, a parameter so tests can fake it. */
export interface FontEnv {
  make(family: string, source: string, descriptors: FontFaceDescriptors): FontFace;
  add(face: FontFace): void;
}

const browserFonts = (): FontEnv => ({
  make: (family, source, descriptors) => new FontFace(family, source, descriptors),
  add: (face) => void document.fonts.add(face),
});

export interface FontLoader<Id extends string> {
  /** loaded: a text can be drawn with it now */
  ready(id: Id): boolean;
  /** loads a font once a session; a failure is not for good, the next call tries again */
  load(id: Id): Promise<void>;
  /**
   * Ready now — true. Otherwise false, and the font starts loading unless it
   * already is; `onReady` is called once it is in (only the call that
   * started the load is called back, so a redraw per frame asks once).
   */
  ensure(id: Id, onReady: () => void): boolean;
}

/**
 * The loader of an app's fonts. `base` is the folder's URL with its slash
 * (`${import.meta.env.BASE_URL}fonts/`). All of a font's subsets load at
 * once: the browser would fetch Cyrillic only at the first Cyrillic letter
 * drawn, and a raster must be whole when it is drawn.
 */
export function createFontLoader<Id extends string>(
  files: Readonly<Record<Id, FontFile>>,
  base: string,
  env: FontEnv = browserFonts(),
): FontLoader<Id> {
  const loading = new Map<Id, Promise<void>>();
  const loaded = new Set<Id>();

  function load(id: Id): Promise<void> {
    const known = loading.get(id);
    if (known) return known;
    const spec = files[id];
    const faces = spec.subsets.map((subset) =>
      env.make(spec.family, `url(${base}${spec.file}-${subset}.woff2) format('woff2')`, {
        weight: spec.weight,
        unicodeRange: SUBSET_RANGES[subset],
      }),
    );
    const promise = Promise.all(faces.map((face) => face.load())).then((done) => {
      for (const face of done) env.add(face);
      loaded.add(id);
    });
    loading.set(id, promise);
    promise.catch(() => loading.delete(id));
    return promise;
  }

  return {
    ready: (id) => loaded.has(id),
    load,
    ensure(id, onReady) {
      if (loaded.has(id)) return true;
      if (!loading.has(id)) load(id).then(onReady, () => {});
      return false;
    },
  };
}
