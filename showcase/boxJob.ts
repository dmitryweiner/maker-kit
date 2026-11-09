// The showcase's one job: a box of the panel's size, built in a module
// worker (box.worker.ts) as an app builds its model. Here, apart from the
// worker, so the main thread imports the type without starting a worker.

export interface BoxJob {
  width: number;
  depth: number;
  height: number;
  /** asked for with the download button: kept, never replaced by a preview */
  export: boolean;
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const size = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1000;

export function isBoxJob(job: unknown): job is BoxJob {
  return isRecord(job) && size(job.width) && size(job.depth) && size(job.height) && typeof job.export === 'boolean';
}
