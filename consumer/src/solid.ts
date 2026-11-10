// The kit's csg modules in an app: a threaded rod built on the real WASM —
// in node by vitest, in the page by a module worker (solid.worker.ts) on
// vite's dev server and in its build.

import { CsgScope, fromManifold, initCSG, outerOutline, toManifold } from 'maker-kit/csg/manifold';
import { symmetricForm, threadRod } from 'maker-kit/csg/thread';
import { boxMesh } from 'maker-kit/3d/mesh';
import { moduleWorker, WorkerClient } from 'maker-kit/worker/client';

/** The volume of an M10 × 2 rod 10 mm long, round-tripped through a mesh, and of a filled square ring. */
export async function rodVolume(): Promise<{ rod: number; box: number; outline: number }> {
  const csg = await initCSG();
  const scope = new CsgScope();
  try {
    const rod = threadRod(csg, scope, symmetricForm(10, 2), 0, 0, 10, { points: 32, slicesPerTurn: 16 });
    const back = scope.keep(toManifold(csg, fromManifold(rod), { merge: true }));
    const box = scope.keep(toManifold(csg, boxMesh(2, 3, 4)));
    const ring = scope.keep(scope.keep(csg.CrossSection.square([4, 4], true)).subtract(scope.keep(csg.CrossSection.square([2, 2], true))));
    return { rod: back.volume(), box: box.volume(), outline: outerOutline(csg, scope, ring).area() };
  } finally {
    scope.dispose();
  }
}

/** The page's half: the worker builds the rod, the page shows its volume in #solid. */
export function startSolid(out: HTMLElement): void {
  const client = new WorkerClient<{ kind: 'rod' }, number>(
    moduleWorker(() => new Worker(new URL('./solid.worker.ts', import.meta.url), { type: 'module' })),
    { lane: () => 'solid', kept: () => true },
  );
  void client.run({ kind: 'rod' }).then(
    (done) => {
      out.textContent = done ? done.result.toFixed(0) : 'none';
    },
    (error: unknown) => {
      out.textContent = `error: ${String(error)}`;
    },
  );
}
