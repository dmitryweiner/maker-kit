// The showcase's job worker: builds the box with the kit's serveJobs, as an
// app's csg.worker.ts builds its model. An export takes a moment longer, so
// the bar's label and its stages show.

import { boxMesh, type SurfaceMesh } from '../src/3d/mesh';
import { serveJobs } from '../src/worker/serve';
import { isBoxJob, type BoxJob } from './boxJob';

serveJobs<BoxJob, SurfaceMesh>({
  isJob: isBoxJob,
  async handle(job, progress) {
    progress({ step: 0, total: 2, label: { code: 'demo.stage.box' } });
    if (job.export) await new Promise((resolve) => setTimeout(resolve, 600));
    const mesh = boxMesh(job.width, job.depth, job.height);
    progress({ step: 2, total: 2, label: { code: 'demo.stage.box' } });
    return { result: mesh, transfer: [mesh.positions.buffer, mesh.normals.buffer, mesh.indices.buffer] };
  },
});
