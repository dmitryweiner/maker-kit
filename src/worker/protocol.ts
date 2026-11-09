// The messages between the main thread and a job worker (Plate Builder's
// protocol, generic). A job goes in with an id; progress, the result or an
// error come back with it. Progress names its stage as a message, never as
// a phrase: the worker does not know the language, which may change mid-job.

import { isMessage } from '../core/message';
import type { JobProgress } from '../core/progress';

export interface WorkerIn<J> {
  jobId: number;
  job: J;
}

/** A reply; `ms` is the time the worker spent on the job, from its arrival. */
export type WorkerOut<R> =
  | ({ type: 'progress'; jobId: number } & JobProgress)
  | { type: 'done'; jobId: number; result: R; ms: number }
  | { type: 'error'; jobId: number; message: string };

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

/** A job envelope: a numeric id and a job the worker takes (its own guard). */
export function isWorkerIn<J>(data: unknown, isJob: (job: unknown) => job is J): data is WorkerIn<J> {
  return isRecord(data) && typeof data.jobId === 'number' && isJob(data.job);
}

/** A reply in one of its three shapes. The result is not checked: it comes from our own worker. */
export function isWorkerOut<R>(data: unknown): data is WorkerOut<R> {
  if (!isRecord(data) || typeof data.jobId !== 'number') return false;
  switch (data.type) {
    case 'progress':
      return typeof data.step === 'number' && typeof data.total === 'number' && (data.label === undefined || isMessage(data.label));
    case 'done':
      return 'result' in data && typeof data.ms === 'number';
    case 'error':
      return typeof data.message === 'string';
    default:
      return false;
  }
}
