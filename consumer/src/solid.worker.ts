// A module worker on maker-kit/csg: the WASM loads here, never on the page.

import { serveJobs } from 'maker-kit/worker/serve';
import { rodVolume } from './solid';

serveJobs<{ kind: 'rod' }, number>({
  isJob: (job): job is { kind: 'rod' } => typeof job === 'object' && job !== null && 'kind' in job && job.kind === 'rod',
  handle: async () => ({ result: (await rodVolume()).rod }),
});
