import { describe, expect, it } from 'vitest';
import { boxMesh, meshNormals, type SurfaceMesh } from './mesh';
import { assessExport, signedVolume, validateMesh } from './validate';

const surface = (mesh: { positions: Float32Array; indices: Uint32Array }): SurfaceMesh => ({
  ...mesh,
  normals: meshNormals(mesh.positions, mesh.indices),
});
const codes = (list: readonly { code: string }[]) => list.map((m) => m.code);

function flipped(indices: Uint32Array): Uint32Array {
  const out = new Uint32Array(indices);
  for (let t = 0; t < out.length; t += 3) [out[t + 1], out[t + 2]] = [out[t + 2] ?? 0, out[t + 1] ?? 0];
  return out;
}

describe('validateMesh', () => {
  it('finds a closed box watertight, with its volume, extents and box', () => {
    const report = validateMesh(surface(boxMesh(10, 8, 6)));
    expect(report.watertight).toBe(true);
    expect(report.volume).toBeCloseTo(480);
    expect(report.extents).toEqual([10, 8, 6]);
    expect(report.bbox).toEqual({ min: [-5, -4, 0], max: [5, 4, 6] });
    expect([report.triangleCount, report.vertexCount, report.degenerateTriangles]).toEqual([12, 8, 0]);
    expect(assessExport(report, true)).toEqual({ blockers: [], warnings: [] });
  });

  it('finds a missing triangle open and a mirrored winding inside out', () => {
    const box = boxMesh(4, 4, 4);
    const open = validateMesh(surface({ ...box, indices: box.indices.slice(3) }));
    expect(open.watertight).toBe(false);
    expect(codes(assessExport(open, true).blockers)).toContain('kit.mesh.open');
    expect(signedVolume(box.positions, flipped(box.indices))).toBeCloseTo(-64);
    expect(codes(assessExport(validateMesh(surface({ ...box, indices: flipped(box.indices) })), true).blockers)).toContain(
      'kit.mesh.inverted',
    );
  });

  it('lets an open surface pass when the part need not be closed', () => {
    const box = boxMesh(4, 4, 4);
    const open = validateMesh(surface({ ...box, indices: box.indices.slice(3) }));
    expect(assessExport(open, false).blockers).toEqual([]);
  });

  it('blocks broken indices, non-finite coordinates, an empty and a flat part', () => {
    const box = boxMesh(4, 4, 4);
    const bad = validateMesh(surface({ ...box, indices: new Uint32Array([0, 1, 99]) }));
    expect(bad.indicesValid).toBe(false);
    expect(codes(assessExport(bad, true).blockers)).toContain('kit.mesh.badIndices');
    const nan = new Float32Array(box.positions);
    nan[0] = Number.NaN;
    expect(codes(assessExport(validateMesh({ ...surface(box), positions: nan }), true).blockers)).toContain('kit.mesh.nonFinite');
    const empty = validateMesh({ positions: new Float32Array(0), normals: new Float32Array(0), indices: new Uint32Array(0) });
    expect(codes(assessExport(empty, true).blockers)).toContain('kit.mesh.empty');
    expect(codes(assessExport(validateMesh(surface(boxMesh(4, 4, 0))), false).blockers)).toContain('kit.mesh.flat');
  });

  it('lets a few slivers of a boolean pass, warns of more, blocks more than 1 %', () => {
    const report = { ...validateMesh(surface(boxMesh(4, 4, 4))), triangleCount: 10000 };
    expect(assessExport({ ...report, degenerateTriangles: 8 }, true)).toEqual({ blockers: [], warnings: [] });
    expect(assessExport({ ...report, degenerateTriangles: 50 }, true).warnings).toEqual([
      { code: 'kit.mesh.degenerate', params: { count: 50, pct: '0.50' } },
    ]);
    expect(codes(assessExport({ ...report, degenerateTriangles: 101 }, true).blockers)).toEqual(['kit.mesh.degenerate']);
  });

  it('counts a triangle with no area as degenerate', () => {
    const mesh = { positions: new Float32Array([0, 0, 0, 1, 0, 0, 2, 0, 0]), indices: new Uint32Array([0, 1, 2]) };
    expect(validateMesh(surface(mesh)).degenerateTriangles).toBe(1);
  });
});
