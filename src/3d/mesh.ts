// Meshes as plain typed arrays: what the worker builds, the 3D view shows,
// the checks read and the STL writer writes. No Three.js here, so a worker
// imports it freely. Millimetres, z up (the printing convention), triangles
// counter-clockwise seen from outside.
//
// Typed arrays are indexed in every inner loop with indices that come from
// the loop's bounds or from a mesh `isValidMesh` took: `a[i]!` says so, where
// `noUncheckedIndexedAccess` would bury the arithmetic in checks that cannot
// fail.

/** A finished mesh: positions, vertex normals and triangle indices. */
export interface SurfaceMesh {
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
}

/** An indexed mesh without normals: what the STL reader gives and a CSG library takes. */
export interface IndexedMesh {
  positions: Float32Array;
  indices: Uint32Array;
}

/** Per-vertex normals: area-weighted face normals, normalised. */
export function meshNormals(positions: Float32Array, indices: Uint32Array): Float32Array {
  const normals = new Float32Array(positions.length);
  for (let t = 0; t < indices.length; t += 3) {
    const a = indices[t]! * 3;
    const b = indices[t + 1]! * 3;
    const c = indices[t + 2]! * 3;
    const abx = positions[b]! - positions[a]!;
    const aby = positions[b + 1]! - positions[a + 1]!;
    const abz = positions[b + 2]! - positions[a + 2]!;
    const acx = positions[c]! - positions[a]!;
    const acy = positions[c + 1]! - positions[a + 1]!;
    const acz = positions[c + 2]! - positions[a + 2]!;
    const nx = aby * acz - abz * acy;
    const ny = abz * acx - abx * acz;
    const nz = abx * acy - aby * acx;
    for (const v of [a, b, c]) {
      normals[v]! += nx;
      normals[v + 1]! += ny;
      normals[v + 2]! += nz;
    }
  }
  for (let v = 0; v < normals.length; v += 3) {
    const len = Math.hypot(normals[v]!, normals[v + 1]!, normals[v + 2]!);
    if (len > 1e-12) {
      normals[v]! /= len;
      normals[v + 1]! /= len;
      normals[v + 2]! /= len;
    }
  }
  return normals;
}

/** Whole triangles, indices in range, finite coordinates: a mesh from outside (a message, storage, a file) is checked so. */
export function isValidMesh({ positions, indices }: IndexedMesh): boolean {
  if (positions.length % 3 !== 0 || indices.length % 3 !== 0 || indices.length === 0) return false;
  const count = positions.length / 3;
  for (const index of indices) if (index >= count) return false;
  for (const value of positions) if (!Number.isFinite(value)) return false;
  return true;
}

/** A box `width` × `depth` × `height` mm standing on the bed, centred: a stand-in, a test solid. */
export function boxMesh(width: number, depth: number, height: number): SurfaceMesh {
  const [x, y] = [width / 2, depth / 2];
  // corners: bottom 0–3 counter-clockwise from above, top 4–7 over them
  const positions = new Float32Array([-x, -y, 0, x, -y, 0, x, y, 0, -x, y, 0, -x, -y, height, x, -y, height, x, y, height, -x, y, height]);
  // prettier-ignore
  const indices = new Uint32Array([
    0, 2, 1, 0, 3, 2, // bottom, seen from below
    4, 5, 6, 4, 6, 7, // top
    0, 1, 5, 0, 5, 4, // front (−y)
    1, 2, 6, 1, 6, 5, // right (+x)
    2, 3, 7, 2, 7, 6, // back (+y)
    3, 0, 4, 3, 4, 7, // left (−x)
  ]);
  return { positions, indices, normals: meshNormals(positions, indices) };
}
