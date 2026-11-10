// Blockers, warnings and notes as one list (Case Constructor's warn lines,
// Plate Builder's Warnings card, Cast Builder's blockers): a line per
// message, its severity its colour (kit.css's `.message.bad|warn|info`), an
// optional badge before the text and an action after it (Plate Builder's
// "show"). The texts come translated: an app's warnings name its own things.
//
// The same lines are not drawn again — a rebuild after each edit repeats
// them, and a click must find its button on mouseup; a button runs the
// action of the latest lines.

import { make } from './dom';

export type Severity = 'bad' | 'warn' | 'info';

export interface MessageLine {
  severity: Severity;
  text: string;
  /** the message's code, as `data-code`: a smoke finds a line by it */
  code?: string;
  /** a badge before the text: Case Constructor's "⚠ 3", the number of its box over the model */
  mark?: string;
  action?: { label: string; run(): void };
}

const drawn = new WeakMap<HTMLElement, { key: string; lines: readonly MessageLine[] }>();

export function renderMessages(list: HTMLUListElement, lines: readonly MessageLine[]): void {
  const key = JSON.stringify(lines.map(({ severity, text, code, mark, action }) => [severity, text, code, mark, action?.label]));
  const last = drawn.get(list);
  drawn.set(list, { key, lines });
  if (last?.key === key) return;
  list.hidden = lines.length === 0;
  list.replaceChildren(
    ...lines.map((line, index) => {
      const li = make('li', `message ${line.severity}`);
      if (line.code !== undefined) li.dataset.code = line.code;
      if (line.mark !== undefined) li.append(make('b', 'message-mark', line.mark));
      li.append(make('span', undefined, line.text));
      if (line.action) {
        const button = make('button', 'link-button', line.action.label);
        button.type = 'button';
        button.addEventListener('click', () => drawn.get(list)?.lines[index]?.action?.run());
        li.append(button);
      }
      return li;
    }),
  );
}
