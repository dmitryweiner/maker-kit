// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { renderMessages, type MessageLine } from './messageList';

let list: HTMLUListElement;
beforeEach(() => {
  document.body.innerHTML = '<ul id="messages" class="messages"></ul>';
  const found = document.getElementById('messages');
  if (!(found instanceof HTMLUListElement)) throw new Error('no list');
  list = found;
});

const items = () => [...list.querySelectorAll('li')];

describe('renderMessages', () => {
  it('is hidden with nothing to say', () => {
    renderMessages(list, []);
    expect(list.hidden).toBe(true);
    expect(items()).toHaveLength(0);
  });

  it('draws a line per message, its severity its colour, its code for a test to find', () => {
    renderMessages(list, [
      { severity: 'bad', text: 'The mesh is not closed.', code: 'kit.mesh.open' },
      { severity: 'warn', text: 'The wall is thin.' },
      { severity: 'info', text: 'The depth was raised.' },
    ]);
    expect(list.hidden).toBe(false);
    expect(items().map((li) => li.className)).toEqual(['message bad', 'message warn', 'message info']);
    expect(items().map((li) => li.querySelector('span')?.textContent)).toEqual([
      'The mesh is not closed.',
      'The wall is thin.',
      'The depth was raised.',
    ]);
    expect(items()[0]?.dataset.code).toBe('kit.mesh.open');
    expect(items()[1]?.dataset.code).toBeUndefined();
  });

  it('puts a badge before the text and an action after it', () => {
    let shown = 0;
    renderMessages(list, [{ severity: 'warn', text: 'Too near the edge.', mark: '⚠ 1', action: { label: 'Show', run: () => shown++ } }]);
    const li = items()[0];
    expect(li?.firstElementChild?.className).toBe('message-mark');
    expect(li?.firstElementChild?.textContent).toBe('⚠ 1');
    const button = li?.querySelector('button');
    expect(button?.type).toBe('button');
    expect(button?.textContent).toBe('Show');
    button?.click();
    expect(shown).toBe(1);
  });

  it('does not draw the same lines again — a click finds its button — and acts with the latest action', () => {
    const calls: string[] = [];
    const lines = (tag: string): MessageLine[] => [
      { severity: 'warn', text: 'Thin.', action: { label: 'Show', run: () => calls.push(tag) } },
    ];
    renderMessages(list, lines('first'));
    const button = list.querySelector('button');
    renderMessages(list, lines('second'));
    expect(list.querySelector('button')).toBe(button);
    button?.click();
    expect(calls).toEqual(['second']);
    renderMessages(list, [{ severity: 'warn', text: 'Thinner.' }]);
    expect(list.querySelector('button')).toBeNull();
    expect(list.textContent).toBe('Thinner.');
  });
});
