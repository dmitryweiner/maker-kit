// The project as a file: `{ app, version, name, savedAt, state }`, indented
// JSON — kept next to the STL, mailed, diffed, opened on another machine.
// The file comes from outside, so reading never throws: a file of another
// app or a random JSON is refused with its reason, never read as defaults
// over the work. Saving and picking the file are the page's (ui/files).

export type DecodedProjectFile<S> = { ok: true; name: string; state: S } | { ok: false; reason: 'broken' | 'foreign' | 'newer' };

export function encodeProjectFile(o: { app: string; version: number; name: string; state: unknown; savedAt?: Date }): string {
  const savedAt = (o.savedAt ?? new Date()).toISOString();
  return JSON.stringify({ app: o.app, version: o.version, name: o.name, savedAt, state: o.state }, null, 2);
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * `sanitize` takes the state of this or an older version; `legacy` reads
 * what is not this app's wrapper (an older app's bare state) or gives null.
 */
export function decodeProjectFile<S>(
  text: string,
  o: { app: string; version: number; sanitize(state: unknown): S; legacy?(data: unknown): S | null },
): DecodedProjectFile<S> {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'broken' };
  }
  try {
    if (!isRecord(data) || data.app !== o.app) {
      const state = o.legacy?.(data) ?? null;
      return state === null ? { ok: false, reason: 'foreign' } : { ok: true, name: '', state };
    }
    if (typeof data.version !== 'number') return { ok: false, reason: 'broken' };
    if (data.version > o.version) return { ok: false, reason: 'newer' };
    if (!isRecord(data.state)) return { ok: false, reason: 'broken' };
    return { ok: true, name: typeof data.name === 'string' ? data.name.trim() : '', state: o.sanitize(data.state) };
  } catch {
    return { ok: false, reason: 'broken' };
  }
}

/** A name safe in every OS's paths: letters and digits of any script, the rest one dash; `fallback` when nothing is left. */
export function fileSlug(name: string, fallback = 'project'): string {
  const slug = name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
  return slug || fallback;
}

/** `${fileSlug(name)}.${ext}`: `door-sign.plate.json`. */
export function projectFileName(name: string, ext: string, fallback?: string): string {
  return `${fileSlug(name, fallback)}.${ext}`;
}
