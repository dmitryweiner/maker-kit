// The bridge between the kit's meshes and manifold-3d (WASM CSG), what each
// app's csg.ts repeated: the module loaded once, a scope that frees what a
// chain of booleans makes, meshes in and out.
//
// Manifold objects are not collected by the GC: everything made goes into a
// `CsgScope`, which is disposed. Only a worker imports this module; an app's
// main thread never loads the WASM. The only module of the kit that imports
// manifold-3d at run time.

import Module from 'manifold-3d';
import type { CrossSection, Manifold, ManifoldToplevel, Mesh } from 'manifold-3d';
import type { IndexedMesh, SurfaceMesh } from '../3d/mesh';
import { meshNormals } from '../3d/mesh';

/** The WASM module: the primitives' constructors and Mesh. */
export type CsgApi = ManifoldToplevel;

let pending: Promise<CsgApi> | null = null;

/** Loads the WASM once per worker or process; later calls get the same promise. */
export function initCSG(): Promise<CsgApi> {
  pending ??= Module().then((wasm) => {
    wasm.setup();
    return wasm;
  });
  return pending;
}

/**
 * Holds Manifold and CrossSection objects and frees them at once. Any chain
 * of booleans breeds intermediates; without a scope the WASM heap grows until
 * it runs out after a few exports.
 */
export class CsgScope {
  private items: { delete(): void }[] = [];

  /** Registers an object for deletion and returns it (handy inside expressions). */
  keep<T extends { delete(): void }>(item: T): T {
    this.items.push(item);
    return item;
  }

  get size(): number {
    return this.items.length;
  }

  dispose(): void {
    for (const item of this.items) item.delete();
    this.items = [];
  }
}

export interface ToManifoldOptions {
  /**
   * Merge vertices that are near each other on open edges. A mesh the app
   * stitched by index arithmetic does not need it; an imported STL may have
   * one vertex written as two slightly different floats.
   */
  merge?: boolean;
}

/**
 * Mesh → Manifold. Throws if the mesh is not a closed solid: Manifold would
 * hand back an object with a NotManifold status that silently spoils every
 * later operation — better to fail here, saying why.
 */
export function toManifold(csg: CsgApi, mesh: IndexedMesh, o: ToManifoldOptions = {}): Manifold {
  const input = new csg.Mesh({
    numProp: 3,
    vertProperties: new Float32Array(mesh.positions),
    triVerts: new Uint32Array(mesh.indices),
  });
  if (o.merge) input.merge();
  // ofMesh throws a bare "Not manifold"; on NonFiniteVertex and the like it
  // returns an object with a status instead. Both become one message.
  let solid: Manifold;
  try {
    solid = csg.Manifold.ofMesh(input);
  } catch (cause) {
    const reason = cause instanceof Error ? cause.message : String(cause);
    throw new Error(`toManifold: mesh is not a closed solid (${reason})`, { cause });
  }
  const status = solid.status();
  if (status !== 'NoError') {
    solid.delete();
    throw new Error(`toManifold: mesh is not a closed solid (${status})`);
  }
  return solid;
}

/** Manifold → mesh with its vertex normals computed anew. */
export function fromManifold(solid: Manifold): SurfaceMesh {
  const mesh: Mesh = solid.getMesh();
  const positions = extractPositions(mesh);
  const indices = new Uint32Array(mesh.triVerts);
  return { positions, indices, normals: meshNormals(positions, indices) };
}

/**
 * A section with its holes filled: the outer rings only (counter-clockwise).
 * A hole through a tile is a post of its mold, not a hole through the mold's
 * land (Cast Builder); a plate's outline has no holes of a picture (Plate
 * Builder).
 */
export function outerOutline(csg: CsgApi, scope: CsgScope, section: CrossSection): CrossSection {
  const outer = section.toPolygons().filter((ring) => {
    let twice = 0;
    for (let i = 0; i < ring.length; i++) {
      const [ax, ay] = ring[i]!;
      const [bx, by] = ring[(i + 1) % ring.length]!;
      twice += ax * by - bx * ay;
    }
    return twice > 0;
  });
  return scope.keep(new csg.CrossSection(outer, 'Positive'));
}

/** x, y, z are a vertex's first three properties; Manifold may give more, so they are picked out. */
function extractPositions(mesh: Mesh): Float32Array {
  const { numProp, vertProperties } = mesh;
  if (numProp === 3) return new Float32Array(vertProperties);
  const count = vertProperties.length / numProp;
  const positions = new Float32Array(count * 3);
  for (let v = 0; v < count; v++) {
    positions[v * 3] = vertProperties[v * numProp]!;
    positions[v * 3 + 1] = vertProperties[v * numProp + 1]!;
    positions[v * 3 + 2] = vertProperties[v * numProp + 2]!;
  }
  return positions;
}
