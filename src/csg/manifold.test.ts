// The bridge to manifold-3d on the real WASM in node (Case Constructor's,
// Plate Builder's and Cast Builder's tests merged).

import { beforeAll, describe, expect, it } from 'vitest';
import { boxMesh } from '../3d/mesh';
import { CsgScope, fromManifold, initCSG, outerOutline, toManifold, type CsgApi } from './manifold';

let csg: CsgApi;
beforeAll(async () => {
  csg = await initCSG();
});

/** A box whose faces do not share their corners: six quads, 24 vertices — an STL read without welding. */
function faceSoup(): { positions: Float32Array; indices: Uint32Array } {
  const box = boxMesh(2, 3, 4);
  const positions: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i < box.indices.length; i++) {
    const v = box.indices[i]!;
    positions.push(box.positions[v * 3]!, box.positions[v * 3 + 1]!, box.positions[v * 3 + 2]!);
    indices.push(i);
  }
  return { positions: new Float32Array(positions), indices: new Uint32Array(indices) };
}

describe('initCSG', () => {
  it('loads manifold once and builds solids', async () => {
    expect(await initCSG()).toBe(csg);
    const scope = new CsgScope();
    expect(scope.keep(csg.Manifold.cube([2, 3, 4])).volume()).toBeCloseTo(24);
    scope.dispose();
  });
});

describe('CsgScope', () => {
  it('deletes everything it keeps, once', () => {
    const deleted: string[] = [];
    const scope = new CsgScope();
    const a = scope.keep({ delete: () => deleted.push('a') });
    scope.keep({ delete: () => deleted.push('b') });
    expect(scope.size).toBe(2);
    expect(typeof a.delete).toBe('function');
    scope.dispose();
    scope.dispose();
    expect(deleted).toEqual(['a', 'b']);
    expect(scope.size).toBe(0);
  });
});

describe('toManifold', () => {
  it('takes a closed solid', () => {
    const scope = new CsgScope();
    expect(scope.keep(toManifold(csg, boxMesh(2, 3, 4))).volume()).toBeCloseTo(24);
    scope.dispose();
  });

  it('throws with the reason on a mesh that is not a closed solid, never hands back a broken object', () => {
    const box = boxMesh(2, 3, 4);
    const open = { positions: box.positions, indices: box.indices.slice(3) };
    expect(() => toManifold(csg, open)).toThrow(/toManifold: mesh is not a closed solid \(.+\)/);
  });

  it('merges vertices written twice only when asked: an imported STL needs it, a mesh of our own does not', () => {
    expect(() => toManifold(csg, faceSoup())).toThrow(/not a closed solid/);
    const scope = new CsgScope();
    expect(scope.keep(toManifold(csg, faceSoup(), { merge: true })).volume()).toBeCloseTo(24);
    scope.dispose();
  });
});

describe('fromManifold', () => {
  it('gives the mesh back with normals', () => {
    const scope = new CsgScope();
    const mesh = fromManifold(scope.keep(csg.Manifold.cube([2, 3, 4])));
    expect(mesh.positions.length % 3).toBe(0);
    expect(mesh.normals).toHaveLength(mesh.positions.length);
    expect(Math.max(...mesh.positions)).toBeCloseTo(4);
    scope.dispose();
  });

  it('picks x, y, z out of vertices with more properties', () => {
    const scope = new CsgScope();
    // normals as properties from the 4th on
    const solid = scope.keep(scope.keep(csg.Manifold.cube([2, 3, 4])).calculateNormals(3, 60));
    expect(solid.getMesh().numProp).toBeGreaterThan(3);
    const mesh = fromManifold(solid);
    const zs = mesh.positions.filter((_, i) => i % 3 === 2);
    expect(Math.min(...zs)).toBeCloseTo(0);
    expect(Math.max(...zs)).toBeCloseTo(4);
    expect(scope.keep(toManifold(csg, mesh, { merge: true })).volume()).toBeCloseTo(24);
    scope.dispose();
  });
});

describe('outerOutline', () => {
  it('fills the holes: a ring becomes a disc, two islands stay two', () => {
    const scope = new CsgScope();
    const ring = scope.keep(
      scope.keep(csg.CrossSection.square([10, 10], true)).subtract(scope.keep(csg.CrossSection.square([4, 4], true))),
    );
    expect(ring.area()).toBeCloseTo(84);
    expect(outerOutline(csg, scope, ring).area()).toBeCloseTo(100);
    const two = scope.keep(ring.add(scope.keep(scope.keep(csg.CrossSection.square([2, 2])).translate([20, 0]))));
    const filled = outerOutline(csg, scope, two);
    expect(filled.area()).toBeCloseTo(104);
    expect(filled.toPolygons()).toHaveLength(2);
    scope.dispose();
  });
});
