// What an app does with the kit: one import per module it uses, through the
// package's exports. Every module the kit adds gets a line here.

import { format } from 'maker-kit/core/format';
import { History } from 'maker-kit/core/history';
import { isMessage, messageText, type Translate } from 'maker-kit/core/message';
import { addUserPreset, presetStatus, type PresetRef, type UserPreset } from 'maker-kit/core/presets';
import { decodeProjectFile, encodeProjectFile, projectFileName } from 'maker-kit/core/projectFile';
import { loadRecord, saveRecord, type KeyValueStorage, type StorageWrite, type StoredRecord } from 'maker-kit/core/storage';
import { kitEn, kitRu, type KitKey } from 'maker-kit/i18n/index';
import { download, pickFile } from 'maker-kit/ui/files';

// the app's dictionaries spread the kit's: its "every key" test covers them
export const en = { ...kitEn, hello: 'Hello, {name}', 'preset.blank.name': 'New box' };
export type Key = keyof typeof en;
export const ru: Record<Key, string> = { ...kitRu, hello: 'Привет, {name}', 'preset.blank.name': 'Новая коробка' };
export const t: Translate<Key> = (key, params) => format(en[key], params, 'en');

/** A component of the kit takes the app's translate function: its keys include the kit's. */
const kitText = (translate: Translate<KitKey>, key: KitKey): string => translate(key);

export function greet(value: unknown): string {
  return isMessage(value) && value.code === 'hello' ? messageText({ code: 'hello', params: value.params }, t) : '';
}

interface Box {
  w: number;
}
const sanitize = (s: unknown): Box => ({ w: typeof s === 'object' && s !== null && 'w' in s && typeof s.w === 'number' ? s.w : 50 });
const record: StoredRecord<Box> = {
  key: 'consumer',
  version: 1,
  write: (box) => ({ box }),
  read: (data) => sanitize(Reflect.get(Object(data), 'box')),
};

export function roundTrip(storage: KeyValueStorage): { saved: StorageWrite; box: Box | null; file: string; refusal: string } {
  const history = new History<Box>({ w: 50 });
  history.commit({ w: 60 });
  const saved = saveRecord(storage, record, history.state);
  const presets: UserPreset<Box>[] = addUserPreset([], 'Mine', history.state).list;
  const ref: PresetRef = 'u:u1';
  const status = presetStatus(
    ref,
    history.state,
    () => presets[0]?.state,
    (s) => JSON.stringify(s),
  );
  const text = encodeProjectFile({ app: 'consumer', version: 1, name: status, state: history.state });
  const read = decodeProjectFile('[]', { app: 'consumer', version: 1, sanitize });
  return {
    saved,
    box: loadRecord(storage, record),
    file: projectFileName(text.length > 0 ? 'Box' : '', 'box.json'),
    refusal: read.ok ? '' : kitText(t, `kit.file.${read.reason}`),
  };
}

/** The page's half: not run in the node test, only compiled and bundled. */
export async function saveAndOpen(): Promise<void> {
  download('box.box.json', '{}', 'application/json');
  await pickFile('.json');
}
