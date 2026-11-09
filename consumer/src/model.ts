// The kit's 3d and worker modules in an app: the mesh checks and STL in
// node, the viewer and the worker client compiled and bundled with three as
// the app's own dependency (a peer of the kit).

import { boxMesh, type SurfaceMesh } from 'maker-kit/3d/mesh';
import { encodeSTL, parseSTL, stlFileName } from 'maker-kit/3d/stl';
import { assessExport, validateMesh } from 'maker-kit/3d/validate';
import { createViewer } from 'maker-kit/3d/viewer';
import { moduleWorker, WorkerClient } from 'maker-kit/worker/client';
import { isWorkerOut } from 'maker-kit/worker/protocol';
import { serveJobs } from 'maker-kit/worker/serve';

export function roundTripStl(): { file: string; triangles: number; blockers: number } {
  const box = boxMesh(20, 10, 5);
  const back = parseSTL(encodeSTL(box, { brand: 'consumer' }));
  const { blockers } = assessExport(validateMesh(box), true);
  return { file: stlFileName('Little box'), triangles: back.indices.length / 3, blockers: blockers.length };
}

/** The page's half: not run in the node test, only compiled and bundled. */
export function startView(canvas: HTMLCanvasElement): void {
  const viewer = createViewer(canvas);
  viewer?.setMeshes([{ mesh: boxMesh(10, 10, 10) }]);
  const client = new WorkerClient<{ size: number }, SurfaceMesh>(
    moduleWorker(() => new Worker(new URL('./model.ts', import.meta.url), { type: 'module' })),
    { lane: () => 'mesh', kept: () => false },
  );
  void client.run({ size: 10 }).then((done) => done && viewer?.setMeshes([{ mesh: done.result }]));
}

export const reply = isWorkerOut;
export const serve = serveJobs;
