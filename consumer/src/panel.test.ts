// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { panel } from './panel';
import { t } from './use';

describe('the kit’s panel in an app', () => {
  it('draws with the app’s dictionary, the kit’s keys among its own', () => {
    let state = { w: 50 };
    const root = panel(
      () => state,
      (next) => (state = next),
    );
    document.body.append(root);
    expect(root.querySelector('#box_w_n')?.getAttribute('aria-label')).toBe('Hello, {name}');
    expect(root.querySelector('#box_w_inc')?.getAttribute('aria-label')).toBe('Increase Hello, {name}');
    root.querySelector<HTMLButtonElement>('#box_w_inc')?.click();
    expect(state.w).toBe(51);
  });
});

describe('the kit’s bar over the view in an app', () => {
  it('takes the app’s keys and the kit’s', async () => {
    const { createProgress } = await import('./panel');
    const wrap = document.createElement('div');
    const progress = createProgress(wrap, { t });
    await progress.track(Promise.resolve(), { label: 'hello', delayMs: 0 });
    expect(wrap.querySelector('.progress-track')?.getAttribute('role')).toBe('progressbar');
  });
});

describe('the kit’s banner, list card and messages in an app', () => {
  it('the banner takes the app’s own advice', async () => {
    const { renderBanner } = await import('./panel');
    const banner = document.createElement('div');
    renderBanner(
      banner,
      { project: 'full', preset: null },
      { t, advice: { blocked: 'storage.advice', full: 'storage.advice' }, onDismiss: () => {} },
    );
    expect(banner.textContent).toBe('Your latest changes are not kept in this browser: its storage is full. Open the box again.');
  });

  it('a list card and a message list draw with the kit’s strings', async () => {
    const { renderItemList, renderMessages } = await import('./panel');
    const list = document.createElement('ul');
    renderItemList(list, { items: [{ id: 'a', title: 'Box' }], body: () => null, t, idPrefix: 'box', remove: () => {} });
    expect(list.querySelector('#box_a_remove')?.getAttribute('aria-label')).toBe('Delete: Box');
    const messages = document.createElement('ul');
    renderMessages(messages, [{ severity: 'warn', text: t('hello', { name: 'kit' }) }]);
    expect(messages.textContent).toBe('Hello, kit');
  });
});
