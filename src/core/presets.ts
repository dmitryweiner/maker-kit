// Presets: the app's built-in ones and the user's own. Pure functions over
// plain lists; the list is kept where the app keeps its project (a record
// field or a record of its own, core/storage).
//
// A preset is known by its id. A built-in one's shown name and note are
// dictionary keys (`preset.<id>.name`, `.note`), so they follow the language;
// a user preset's id (`u<n>`) stays across renames. The app's blank preset —
// what the top bar's 📄 New opens — is a built-in one with `listed: false`.

export interface BuiltInPreset<S> {
  id: string;
  build(): S;
  /** false: not in the presets dialog (the blank one) */
  listed?: boolean;
}

export interface UserPreset<S> {
  /** `u<n>`, stable across renames */
  id: string;
  name: string;
  state: S;
}

/** Which preset is open: a built-in (`b:<id>`), a user one (`u:<id>`), or none. */
export type PresetRef = `b:${string}` | `u:${string}` | '';
export type PresetStatus = 'none' | 'same' | 'changed';

export const PRESET_NAME_CHARS = 60;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const USER_ID = /^u(\d{1,9})$/;

/** `over` laid on `base`: objects merge key by key, anything else (a list, a number) replaces. */
export function overlay(base: unknown, over: unknown): unknown {
  if (!isRecord(base) || !isRecord(over)) return over;
  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(over)) out[key] = overlay(base[key], value);
  return out;
}

const cleanName = (name: string): string => name.trim().slice(0, PRESET_NAME_CHARS);
const idNumber = (id: string): number => Number(USER_ID.exec(id)?.[1] ?? 0);
const nextId = (ids: Iterable<string>): string => `u${Math.max(0, ...[...ids].map(idNumber)) + 1}`;

/**
 * The user presets in what storage held: an entry without a state is
 * dropped, every state goes through `sanitize`; a missing, broken or
 * repeated id gets a free one, a missing name the id.
 */
export function readUserPresets<S>(value: unknown, sanitize: (state: unknown) => S): UserPreset<S>[] {
  if (!Array.isArray(value)) return [];
  const entries = value.filter((entry): entry is Record<string, unknown> => isRecord(entry) && isRecord(entry.state));
  // valid ids are claimed first, so one later in the list keeps its own
  const taken = new Set<string>();
  const ids = entries.map((entry) => {
    const id = typeof entry.id === 'string' && USER_ID.test(entry.id) && !taken.has(entry.id) ? entry.id : null;
    if (id) taken.add(id);
    return id;
  });
  return entries.map((entry, i) => {
    let id = ids[i];
    if (!id) {
      id = nextId(taken);
      taken.add(id);
    }
    const name = typeof entry.name === 'string' && entry.name.trim() ? cleanName(entry.name) : id;
    return { id, name, state: sanitize(entry.state) };
  });
}

export function addUserPreset<S>(list: readonly UserPreset<S>[], name: string, state: S): { list: UserPreset<S>[]; id: string } {
  const id = nextId(list.map((preset) => preset.id));
  return { list: [...list, { id, name: cleanName(name) || id, state }], id };
}

/** Renames in place; a name with nothing but spaces changes nothing. */
export function renameUserPreset<S>(list: readonly UserPreset<S>[], id: string, name: string): UserPreset<S>[] {
  const clean = cleanName(name);
  return list.map((preset) => (preset.id === id && clean ? { ...preset, name: clean } : preset));
}

export function removeUserPreset<S>(list: readonly UserPreset<S>[], id: string): UserPreset<S>[] {
  return list.filter((preset) => preset.id !== id);
}

/**
 * The auto name of a new preset, "<prefix> N": N is one more than the
 * highest number after any language's prefix, so a language switch does not
 * restart the numbering and muddle the list.
 */
export function nextPresetName(list: readonly { name: string }[], prefixes: readonly string[], prefix: string): string {
  let highest = 0;
  for (const { name } of list) {
    for (const p of prefixes) {
      if (!name.startsWith(`${p} `)) continue;
      const tail = name.slice(p.length + 1);
      if (/^\d+$/.test(tail)) highest = Math.max(highest, Number(tail));
    }
  }
  return `${prefix} ${highest + 1}`;
}

export function presetRef(kind: 'b' | 'u', id: string): PresetRef {
  return kind === 'b' ? `b:${id}` : `u:${id}`;
}

export function isPresetRef(value: unknown): value is PresetRef {
  return value === '' || (typeof value === 'string' && /^[bu]:./.test(value));
}

/**
 * Whether the project is still the preset it was opened from. `signature`
 * leaves out what does not make a project different (how it is viewed and
 * exported): changed only by those, it is still the preset.
 */
export function presetStatus<S>(
  ref: PresetRef,
  state: S,
  find: (ref: PresetRef) => S | undefined,
  signature: (state: S) => string,
): PresetStatus {
  if (ref === '') return 'none';
  const preset = find(ref);
  if (preset === undefined) return 'none';
  return signature(preset) === signature(state) ? 'same' : 'changed';
}
