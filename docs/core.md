# core — logic without the DOM

Every module here is pure or takes the browser's API as a parameter; none
imports `ui`, `3d`, `worker`, `three` or `node:*` (the lint rule says so).

## core/message — the i18n contract

```ts
type Params = Readonly<Record<string, string | number>>;
type Translate<K extends string> = (key: K, params?: Params) => string;
type Label<K extends string> = K | { text: string };   // a key, or ready text (a port id, a font name)
interface Message<C extends string = string> { code: C; params?: Params }

isMessage(value: unknown): value is Message;            // what came through postMessage
labelText(label, t): string;
messageText(message, t): string;
```

The core and the worker send a `Message`; the app turns it into text when
it is shown, so a language switch mid-job shows the new language.

## core/format — templates

`format(template, params, locale)`: `{name}` is a parameter; `{n|…}` picks
a word by the number, the forms in CLDR's order of the language's plural
categories — en `one|other`, ru and uk `one|few|many`, he `one|two|other`.
A category with no form of its own (a fraction in Russian) takes the last.
`placeholders(template)` lists the parameter names, for the test that every
language has the same.

## core/history — undo and redo

```ts
const history = new History(initial, 100);
history.live(frame);   // a frame of a gesture: shown, not a step
history.commit(next);  // the end of an edit: one step from before the gesture
history.undo();        // during a gesture: back to before it
history.reset(state);  // the app's start, a storage reset
```

States are plain data, compared by their JSON text: a commit that changes
nothing is no step. Opening a preset, 📄 New or a project file is a
`commit` — undo brings the previous project back; `reset` is not for them.
A state that holds a heavy mesh keeps it by reference (an id), never inline.

## core/storage — what survives a reload

```ts
const settings: StoredRecord<Settings> = {
  key: __APP_ID__,
  version: 2,
  write: (value) => ({ settings: value }),        // stored as { version: 2, settings }
  read(data, version) { /* sanitise; migrate version 1; null: start fresh */ },
};
const storage = browserStorage();                  // null when the browser blocks it
loadRecord(storage, settings);                     // V | null
saveRecord(storage, settings, value);              // 'ok' | 'blocked' | 'full'
removeRecord(storage, settings);
```

- `read` gets the parsed JSON as it is and its version; a value stored with
  no version at all (an older app's format) comes as version 0. A newer
  version than the record's, unreadable JSON or a `read` that throws: null.
- `write` gives the fields stored beside `version`, so an app moving to the
  kit keeps the shape it already stores, and nothing needs migrating.
- `full` is the quota (Firefox's `NS_ERROR_DOM_QUOTA_REACHED` too); every
  other failure, and no storage, is `blocked`. The app shows both (ui/banner).
- Several records per app (a heavy model apart from the settings, so a
  slider never re-encodes it); every key starts with the app id.

## core/projectFile — the project as a file

```ts
encodeProjectFile({ app, version, name, state, savedAt? }): string;   // indented JSON
decodeProjectFile(text, { app, version, sanitize, legacy? })
  // { ok: true, name, state } | { ok: false, reason: 'broken' | 'foreign' | 'newer' }
fileSlug(name, fallback = 'project');          // 'Door sign' → 'door-sign'; letters of any script kept
projectFileName(name, ext, fallback?);         // 'door-sign.plate.json'
```

A file of another app, or random JSON, is `foreign` — never defaults over
the work; `legacy` reads an older app's bare state. Reasons are shown with
`kit.file.<reason>`. Saving and picking a file: `ui/files`.

## core/presets — built-in and the user's

```ts
interface BuiltInPreset<S> { id; build(): S; listed?: boolean }   // name, note: `preset.<id>.name`, `.note`
interface UserPreset<S> { id: `u<n>`; name; state }
type PresetRef = `b:${string}` | `u:${string}` | '';

overlay(base, over);                            // partial JSON laid over the defaults
readUserPresets(stored, sanitize);              // what storage held, cleaned, ids unique
addUserPreset(list, name, state);               // { list, id }
renameUserPreset(list, id, name); removeUserPreset(list, id);
nextPresetName(list, prefixesOfEveryLanguage, prefix);   // 'Case 6'
presetRef('b', id); isPresetRef(value);
presetStatus(ref, state, find, signature);      // 'none' | 'same' | 'changed'
```

- Names are cut to 60 characters; a name of spaces renames nothing.
- `signature` leaves out what does not make a project different (the view,
  the export resolution).
- 📄 New opens the app's blank preset, `{ id: 'blank', listed: false }`, as
  one undo step; its name (`preset.blank.name`) becomes the project's.

## i18n — the kit's strings

`maker-kit/i18n/index`: `kitEn`, `kitRu`, `kitUk`, `kitHe`, `KitKey`,
`kitMessages`, `KIT_LOCALES`. An app spreads them into its dictionaries:

```ts
export const en = { ...kitEn, 'app.title': 'Plate Builder', … };
```

Components of the kit take `Translate<K>` with `K extends KitKey`.
