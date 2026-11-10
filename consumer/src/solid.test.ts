import { describe, expect, it } from 'vitest';
import { rodVolume } from './solid';

describe('the kit’s csg modules in an app', () => {
  it('load the WASM from node_modules and build a threaded rod', async () => {
    const { rod, box, outline } = await rodVolume();
    // between the minor cylinder (r 4) and the major one (r 5), 10 mm long
    expect(rod).toBeGreaterThan(Math.PI * 16 * 10);
    expect(rod).toBeLessThan(Math.PI * 25 * 10);
    expect(box).toBeCloseTo(24);
    expect(outline).toBeCloseTo(16);
  });
});
