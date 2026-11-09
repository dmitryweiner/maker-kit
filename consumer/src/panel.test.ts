// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { panel } from './panel';

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
