// What an app does with the kit: one import per module it uses, through the
// package's exports. Every module the kit adds gets a line here.

import { format } from 'maker-kit/core/format';
import { History } from 'maker-kit/core/history';
import { isMessage, messageText, type Translate } from 'maker-kit/core/message';
import { addUserPreset, presetStatus, type PresetRef, type UserPreset } from 'maker-kit/core/presets';
import { decodeProjectFile, encodeProjectFile, projectFileName } from 'maker-kit/core/projectFile';
import { loadRecord, saveRecord, type KeyValueStorage, type StorageWrite, type StoredRecord } from 'maker-kit/core/storage';
import { isTextRaster, traceContours, type TextRaster } from 'maker-kit/core/raster';
import { heightfieldMesh } from 'maker-kit/3d/heightfield';
import { kitEn, kitRu, type KitKey } from 'maker-kit/i18n/index';
import { download, pickFile } from 'maker-kit/ui/files';
import { createFontLoader, type FontFile } from 'maker-kit/ui/fonts';
import { fitPixels, importImage } from 'maker-kit/ui/imageImport';
import { rasterizeText } from 'maker-kit/ui/textRaster';

// the app's dictionaries spread the kit's: its "every key" test covers them
export const en = { ...kitEn, hello: 'Hello, {name}', 'preset.blank.name': 'New box', 'storage.advice': 'Open the box again.' };
export type Key = keyof typeof en;
export const ru: Record<Key, string> = {
  ...kitRu,
  hello: 'Привет, {name}',
  'preset.blank.name': 'Новая коробка',
  'storage.advice': 'Откройте коробку снова.',
};
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

/** A label on the box: a raster the worker checks and traces, a picture's solid, a picture's kept size. */
export function label(): { rings: number; solid: number; kept: [number, number] } {
  const raster: TextRaster = {
    width: 3,
    height: 3,
    data: new Uint8Array([0, 0, 0, 0, 255, 0, 0, 0, 0]),
    pxPerMm: 10,
    cap: 1,
    originX: 1.5,
    originY: 1.5,
  };
  const rings = isTextRaster(raster) ? traceContours(raster).length : 0;
  const solid = heightfieldMesh(() => 1, { width: 4, height: 2, step: 1, zero: 0, bottom: -1 }).indices.length / 3;
  return { rings, solid, kept: fitPixels(1024, 512, 256) };
}

const FONTS: Record<'rubik', FontFile> = {
  rubik: { family: 'box-rubik', label: 'Rubik', file: 'rubik', weight: '700', subsets: ['latin'] },
};

/** The page's half: not run in the node test, only compiled and bundled. */
export async function saveAndOpen(file: Blob): Promise<void> {
  download('box.box.json', '{}', 'application/json');
  await pickFile('.json');
  const fonts = createFontLoader(FONTS, '/fonts/');
  if (fonts.ensure('rubik', () => {})) rasterizeText({ lines: ['Box'], capMm: 5, font: FONTS.rubik });
  await importImage(file, 64);
}
