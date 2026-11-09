import { describe, expect, it } from 'vitest';
import { boxMesh, isValidMesh, meshNormals } from './mesh';

describe('boxMesh', () => {
  it('is a closed box on the bed, centred, its triangles counter-clockwise from outside', () => {
    const box = boxMesh(10, 8, 6);
    expect([box.positions.length / 3, box.indices.length / 3]).toEqual([8, 12]);
    const xs = [...box.positions].filter((_, i) => i % 3 === 0);
    const zs = [...box.positions].filter((_, i) => i % 3 === 2);
    expect([Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)]).toEqual([-5, 5, 0, 6]);
  });
});

describe('meshNormals', () => {
  it('are unit vectors pointing out of the box', () => {
    const box = boxMesh(2, 2, 2);
    const normals = meshNormals(box.positions, box.indices);
    for (let v = 0; v < normals.length; v += 3) {
      const [nx = 0, ny = 0, nz = 0] = normals.subarray(v, v + 3);
      const [x = 0, y = 0, z = 0] = box.positions.subarray(v, v + 3);
      expect(Math.hypot(nx, ny, nz)).toBeCloseTo(1);
      // a corner's normal points away from the box's centre (0, 0, 1)
      expect(nx * x + ny * y + nz * (z - 1)).toBeGreaterThan(0);
    }
  });
});

describe('isValidMesh', () => {
  it('takes whole triangles with indices in range and finite coordinates', () => {
    expect(isValidMesh(boxMesh(1, 1, 1))).toBe(true);
  });

  it.each([
    ['no triangles', { positions: new Float32Array(9), indices: new Uint32Array(0) }],
    ['a partial triangle', { positions: new Float32Array(9), indices: new Uint32Array([0, 1]) }],
    ['a partial vertex', { positions: new Float32Array(8), indices: new Uint32Array([0, 1, 2]) }],
    ['an index out of range', { positions: new Float32Array(9), indices: new Uint32Array([0, 1, 3]) }],
    ['a NaN', { positions: new Float32Array([0, 0, 0, 1, 0, 0, Number.NaN, 1, 0]), indices: new Uint32Array([0, 1, 2]) }],
  ])('refuses a mesh from outside with %s', (_, mesh) => {
    expect(isValidMesh(mesh)).toBe(false);
  });
});
