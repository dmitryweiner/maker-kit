// What an app does with the kit: one import per module it uses, through the
// package's exports. Every module the kit adds gets a line here.

import { isMessage, messageText, type Translate } from 'maker-kit/core/message';

export type Key = 'hello';
export const t: Translate<Key> = (key, params) => `${key} ${params?.name ?? ''}`.trim();

export function greet(value: unknown): string {
  return isMessage(value) && value.code === 'hello' ? messageText({ code: 'hello', params: value.params }, t) : '';
}
