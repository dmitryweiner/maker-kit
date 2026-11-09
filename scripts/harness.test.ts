import { describe, expect, it } from 'vitest';
import { binaryStl, createSteps, parseArgs } from './harness.mjs';

describe('parseArgs', () => {
  it('reads bare flags and flags with a value', () => {
    const flags = parseArgs(['--preview', '--out', 'a.png', 'stray', '--shots'], ['out']);
    expect([...flags]).toEqual([
      ['preview', 'true'],
      ['out', 'a.png'],
      ['shots', 'true'],
    ]);
  });

  it('collects a repeatable flag into a list', () => {
    const flags = parseArgs(['--set', 'a=1', '--lang', 'he', '--set', 'b=2'], ['lang'], ['set']);
    expect(flags.get('set')).toEqual(['a=1', 'b=2']);
    expect(flags.get('lang')).toBe('he');
  });
});

/** A binary STL of `count` zero triangles under an 80-byte header. */
function stl(header: string, count: number, extra = 0): Uint8Array {
  const bytes = new Uint8Array(84 + 50 * count + extra);
  bytes.set(new TextEncoder().encode(header));
  new DataView(bytes.buffer).setUint32(80, count, true);
  return bytes;
}

describe('binaryStl', () => {
  it('reads the triangle count and the header', () => {
    expect(binaryStl(stl('maker-kit box', 12))).toEqual({ header: 'maker-kit box', triangles: 12 });
  });

  it('refuses a file whose size does not match its count', () => {
    expect(binaryStl(stl('x', 12, 3))).toBeNull();
    expect(binaryStl(new Uint8Array(40))).toBeNull();
  });

  it('reads a Node Buffer at an offset in its pool', () => {
    const pool = new Uint8Array(1000);
    const file = stl('pooled', 2);
    pool.set(file, 100);
    expect(binaryStl(pool.subarray(100, 100 + file.length))).toEqual({ header: 'pooled', triangles: 2 });
  });
});

function fakeApp() {
  const calls: string[] = [];
  const lines: string[] = [];
  const errors: string[] = [];
  let clock = 0;
  const steps = createSteps(
    {
      errors,
      label: (text: string) => calls.push(`label ${text}`),
      close: async () => {
        calls.push('close');
      },
    },
    { log: (line: string) => lines.push(`log ${line}`), error: (line: string) => lines.push(`error ${line}`) },
    () => (clock += 250),
  );
  return { calls, lines, errors, steps };
}

describe('createSteps', () => {
  it('labels a step and prints it with its time', async () => {
    const { calls, lines, steps } = fakeApp();
    await steps.step('opens', async () => {});
    expect(calls).toEqual(['label opens']);
    expect(lines).toEqual(['log ok  opens (250 ms)']);
  });

  it('runs the steps, prints the summary and closes', async () => {
    const { calls, lines, steps } = fakeApp();
    const code = await steps.run(async () => {
      await steps.step('one', async () => {});
    }, 'smoke passed (dev)');
    expect(code).toBe(0);
    expect(lines.at(-1)).toBe('log smoke passed (dev)');
    expect(calls.at(-1)).toBe('close');
  });

  it('fails on the first failed step and still closes', async () => {
    const { calls, lines, steps } = fakeApp();
    let reached = false;
    const code = await steps.run(async () => {
      await steps.step('one', async () => {
        throw new Error('no box');
      });
      reached = true;
    });
    expect(code).toBe(1);
    expect(reached).toBe(false);
    expect(lines).toEqual(['error FAIL no box']);
    expect(calls.at(-1)).toBe('close');
  });

  it('fails on console errors after passing steps, and prints them', async () => {
    const { lines, errors, steps } = fakeApp();
    const code = await steps.run(async () => {
      errors.push('[one] TypeError: x is undefined');
    });
    expect(code).toBe(1);
    expect(lines).toEqual(['error FAIL console errors:\n[one] TypeError: x is undefined']);
  });

  it('prints the console errors under a failed step: they often say why', async () => {
    const { lines, errors, steps } = fakeApp();
    await steps.run(async () => {
      errors.push('[one] TypeError: x is undefined');
      throw new Error('no box');
    });
    expect(lines).toEqual(['error FAIL no box', 'error [one] TypeError: x is undefined']);
  });
});
