// An app's smoke imports `maker-kit/harness`: the export's types resolve
// for tsc and its .mjs runs from node_modules. No browser here: the kit's
// own smoke drives the rest.

import { describe, expect, it } from 'vitest';
import { binaryStl, check, launch, offline, parseArgs, type Harness } from 'maker-kit/harness';

/** How an app's scripts/smoke.mjs starts, typed: never called here. */
export async function smoke(): Promise<void> {
  const app: Harness = await launch({ preview: false, ports: { dev: 5999, preview: 4999 } });
  await app.run(async () => {
    await app.step('opens', async () => {
      const { page, context } = await app.open({ path: '?lang=he' });
      check((await page.getAttribute('html', 'dir')) === 'rtl', 'not mirrored');
      await context.close();
    });
    await app.step('works offline', async () => {
      const { page, context } = await offline(app, {
        path: '?lang=he',
        ready: async (p) => check((await p.locator('h1').count()) === 1, 'not offline'),
      });
      await page.reload();
      await context.close();
    });
  });
}

describe('maker-kit/harness', () => {
  it('runs from node_modules', () => {
    expect(parseArgs(['--preview']).get('preview')).toBe('true');
    // without repeatable flags every value is a string
    const out: string | undefined = parseArgs(['--out', 'a.png'], ['out']).get('out');
    expect(out).toBe('a.png');
    const set: string | string[] | undefined = parseArgs(['--set', 'a'], [], ['set']).get('set');
    expect(set).toEqual(['a']);
    expect(binaryStl(new Uint8Array(84))).toEqual({ header: '', triangles: 0 });
  });
});
