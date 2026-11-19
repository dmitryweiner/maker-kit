import { afterEach, describe, expect, it, vi } from 'vitest';
import { binaryStl, createSteps, ensureServer, offline, parseArgs } from './harness.mjs';

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

/** A port where a server already answers. */
const listening = async (): Promise<boolean> => true;

describe('ensureServer', () => {
  const ports = { dev: 5395, preview: 4395 };

  it('takes a dev server already on the port: it serves the code as it is now', async () => {
    expect(await ensureServer({ preview: false, ports, up: listening })).toEqual({ base: 'http://localhost:5395/', proc: null });
  });

  it('refuses a busy preview port: a server there serves an old build, and a build under it would not be seen', async () => {
    await expect(ensureServer({ preview: true, ports, up: listening })).rejects.toThrow(
      /port 4395 is taken.*lsof -nP -iTCP:4395 -sTCP:LISTEN/s,
    );
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

/**
 * A page and its context that write down what is done to them. The page
 * runs the function it evaluates, under a `navigator` whose service worker
 * gets ready when `ready` does.
 */
function fakeVisit(ready: Promise<unknown> = Promise.resolve()) {
  const done: string[] = [];
  vi.stubGlobal('navigator', { serviceWorker: { ready } });
  const page = {
    evaluate: async <A, R>(fn: (arg: A) => R, arg: A) => {
      done.push('wait for the service worker');
      return fn(arg);
    },
    reload: async () => void done.push('reload'),
  };
  const context = {
    setOffline: async (off: boolean) => void done.push(`offline ${off}`),
    close: async () => void done.push('close'),
  };
  const app = {
    open: async (o?: { path?: string }) => {
      done.push(`open ${o?.path ?? ''}`);
      return { page, context };
    },
  };
  return { app, page, context, done };
}

describe('offline', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('warms the cache on a first visit, then reloads with no network and asks the app whether it is there', async () => {
    const { app, page, context, done } = fakeVisit();
    const opened = await offline(app as never, {
      path: '?lang=he',
      ready: async (p) => {
        expect(p).toBe(page);
        done.push('ready?');
      },
    });
    expect(done).toEqual(['open ?lang=he', 'wait for the service worker', 'reload', 'offline true', 'reload', 'ready?']);
    // the page stays open and offline: the app goes on checking it
    expect(opened).toEqual({ page, context });
  });

  it('fails as the app’s check does, and closes the page it opened: the caller never gets it', async () => {
    const { app, done } = fakeVisit();
    await expect(
      offline(app as never, {
        ready: async () => {
          throw new Error('the app did not load offline');
        },
      }),
    ).rejects.toThrow('the app did not load offline');
    expect(done.at(-1)).toBe('close');
  });

  it('fails, not hangs, when the service worker never gets ready: none registered, or its install failed', async () => {
    const { app, done } = fakeVisit(new Promise(() => {}));
    await expect(offline(app as never, { timeout: 10, ready: async () => void done.push('ready?') })).rejects.toThrow(
      'the service worker never became ready',
    );
    expect(done).toEqual(['open ', 'wait for the service worker', 'close']);
  });
});
