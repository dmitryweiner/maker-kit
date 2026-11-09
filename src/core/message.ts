// The i18n contract of the kit (plans/PLAN.md, "i18n contract"). The kit owns
// no dictionary of the app and no current language: everything it draws gets
// a translate function. Messages from the core and the worker travel as a
// code plus parameters, never as a phrase — the language may change mid-job —
// and become text only when shown.

export type Params = Readonly<Record<string, string | number>>;
export type Translate<K extends string> = (key: K, params?: Params) => string;
/** A dictionary key, or ready text when there is nothing to translate (a port id, a font name). */
export type Label<K extends string> = K | { text: string };

export interface Message<C extends string = string> {
  code: C;
  params?: Params;
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

/** A message as it comes through `postMessage`: a code, and parameters of strings and numbers only. */
export function isMessage(value: unknown): value is Message {
  if (!isRecord(value) || typeof value.code !== 'string' || value.code === '') return false;
  if (value.params === undefined) return true;
  return isRecord(value.params) && Object.values(value.params).every((param) => typeof param === 'string' || typeof param === 'number');
}

export function labelText<K extends string>(label: Label<K>, t: Translate<K>): string {
  return typeof label === 'string' ? t(label) : label.text;
}

export function messageText<K extends string>(message: Message<K>, t: Translate<K>): string {
  return t(message.code, message.params);
}
