import { describe, expect, it } from 'vitest';
import { boxMesh, meshNormals } from './mesh';
import { encodeSTL, parseSTL, stlFileName, weld } from './stl';
import { validateMesh } from './validate';

const ascii = (text: string) => new TextEncoder().encode(text).buffer;

/** A binary STL read by hand: the header, the count, each triangle's normal and corners. */
function read(buf: ArrayBuffer) {
  const dv = new DataView(buf);
  const header = new TextDecoder().decode(new Uint8Array(buf, 0, 80)).replace(/\0+$/, '');
  const count = dv.getUint32(80, true);
  const floats = (off: number) => [0, 1, 2].map((k) => dv.getFloat32(off + k * 4, true));
  const triangles = Array.from({ length: count }, (_, t) => {
    const off = 84 + t * 50;
    return { normal: floats(off), corners: [floats(off + 12), floats(off + 24), floats(off + 36)] };
  });
  return { header, count, triangles };
}

describe('encodeSTL', () => {
  const mesh = boxMesh(10, 8, 6);

  it('is 84 + 50 bytes a triangle, the app and the part named in the header', () => {
    const buf = encodeSTL(mesh, { brand: 'Case Constructor', name: 'body' });
    expect(buf.byteLength).toBe(84 + 12 * 50);
    const { header, count } = read(buf);
    expect([header, count]).toEqual(['Case Constructor body', 12]);
    expect(read(encodeSTL(mesh)).header).toBe('maker-kit');
  });

  it('writes the positions in millimetres, in triangle order', () => {
    const { triangles } = read(encodeSTL(mesh));
    triangles.forEach(({ corners }, t) => {
      corners.forEach((corner, v) => {
        const src = (mesh.indices[t * 3 + v] ?? 0) * 3;
        corner.forEach((x, c) => expect(x).toBeCloseTo(mesh.positions[src + c] ?? Number.NaN, 5));
      });
    });
  });

  it('writes unit normals that agree with the winding', () => {
    for (const { normal, corners } of read(encodeSTL(mesh)).triangles) {
      const [a = [], b = [], c = []] = corners;
      const ab = b.map((x, k) => x - (a[k] ?? 0));
      const ac = c.map((x, k) => x - (a[k] ?? 0));
      const [abx = 0, aby = 0, abz = 0] = ab;
      const [acx = 0, acy = 0, acz = 0] = ac;
      const cross = [aby * acz - abz * acy, abz * acx - abx * acz, abx * acy - aby * acx];
      const [nx = 0, ny = 0, nz = 0] = normal;
      expect(Math.hypot(nx, ny, nz)).toBeCloseTo(1, 4);
      expect((nx * (cross[0] ?? 0) + ny * (cross[1] ?? 0) + nz * (cross[2] ?? 0)) / Math.hypot(...cross)).toBeGreaterThan(0.999);
    }
  });
});

describe('parseSTL', () => {
  it('reads back what encodeSTL wrote, with shared vertices, a closed solid', () => {
    const box = boxMesh(10, 8, 6);
    const back = parseSTL(encodeSTL(box));
    expect([back.positions.length, back.indices.length]).toEqual([box.positions.length, box.indices.length]);
    expect(validateMesh({ ...back, normals: meshNormals(back.positions, back.indices) }).watertight).toBe(true);
  });

  it('reads ASCII STL', () => {
    const mesh = parseSTL(
      ascii(`solid t
  facet normal 0 0 -1
    outer loop
      vertex 0 0 0
      vertex 0 1 0
      vertex 1 0 0
    endloop
  endfacet
  facet normal 0 0 1
    outer loop
      vertex 0 0 0
      vertex 1 0 0
      vertex 0 0 1.5e0
    endloop
  endfacet
endsolid t`),
    );
    expect([mesh.indices.length, mesh.positions.length]).toEqual([6, 12]);
  });

  it('takes a binary file whose header starts with "solid" as binary', () => {
    const data = encodeSTL(boxMesh(2, 2, 2));
    new TextEncoder().encodeInto('solid exported by some CAD', new Uint8Array(data, 0, 80));
    expect(parseSTL(data).indices.length).toBe(36);
  });

  it('refuses what is not STL', () => {
    expect(() => parseSTL(ascii('hello'))).toThrow('neither binary nor ASCII');
    expect(() => parseSTL(new ArrayBuffer(10))).toThrow('neither binary nor ASCII');
    expect(() => parseSTL(ascii('solid empty\nendsolid'))).toThrow('no triangles');
    expect(() => parseSTL(ascii('solid x\nvertex 0 0 0\nvertex 1 0 0\nendsolid'))).toThrow('three vertices');
    expect(() => parseSTL(ascii('solid x\nvertex 0 0 0\nvertex 1 0 0\nvertex a 0 0\nendsolid'))).toThrow('not a number');
  });
});

describe('weld', () => {
  it('merges equal corners, +0 and −0 included, and drops collapsed triangles', () => {
    const soup = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, -0, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 0, 1]);
    const mesh = weld(soup);
    expect([mesh.positions.length / 3, mesh.indices.length]).toEqual([4, 6]);
    expect(Object.is(mesh.positions[0], -0)).toBe(false);
  });
});

describe('stlFileName', () => {
  it('is the project’s name as a slug', () => {
    expect(stlFileName('Door sign')).toBe('door-sign.stl');
    expect(stlFileName('', 'plate')).toBe('plate.stl');
  });
});
