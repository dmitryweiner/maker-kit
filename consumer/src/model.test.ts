import { describe, expect, it } from 'vitest';
import { roundTripStl } from './model';

describe('the kit’s 3d modules in an app', () => {
  it('check a mesh and write and read STL', () => {
    expect(roundTripStl()).toEqual({ file: 'little-box.stl', triangles: 12, blockers: 0 });
  });
});
