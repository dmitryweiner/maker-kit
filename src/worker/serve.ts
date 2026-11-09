// The worker's side of the protocol: what each app's csg.worker.ts repeated.
// It takes the jobs it knows, runs them one at a time as they come, sends
// progress, the result with its time and the buffers to move, or the error's
// message. The time counts from the job's arrival, so the first job's
// includes loading WASM.

import type { JobProgress } from '../core/progress';
import { isWorkerIn, type WorkerOut } from './protocol';

/** What a job gives back: the result and the buffers moved, not copied, to the main thread. */
export interface JobAnswer<R> {
  result: R;
  transfer?: Transferable[];
}

/** The worker's global scope, or a test's double. */
export interface WorkerScope {
  addEventListener(type: 'message', listener: (event: MessageEvent) => void): void;
  postMessage(message: unknown, options: { transfer: Transferable[] }): void;
}

export interface ServeOptions<J, R> {
  /** the worker's own guard: what came through postMessage is checked */
  isJob(job: unknown): job is J;
  handle(job: J, progress: (progress: JobProgress) => void): JobAnswer<R> | Promise<JobAnswer<R>>;
  /** `self` in a worker */
  scope?: WorkerScope;
  now?: () => number;
}

export function serveJobs<J, R>(o: ServeOptions<J, R>): void {
  const scope: WorkerScope = o.scope ?? self;
  const now = o.now ?? (() => performance.now());
  const send = (message: WorkerOut<R>, transfer: Transferable[] = []): void => scope.postMessage(message, { transfer });

  // one at a time, in the order they came: the client sends the next only after a reply anyway
  let queue = Promise.resolve();
  scope.addEventListener('message', (event) => {
    const data: unknown = event.data;
    if (!isWorkerIn(data, (job): job is J => o.isJob(job))) return;
    const { jobId, job } = data;
    const started = now();
    queue = queue.then(async () => {
      try {
        const answer = await o.handle(job, (progress) => send({ type: 'progress', jobId, ...progress }));
        send({ type: 'done', jobId, result: answer.result, ms: now() - started }, answer.transfer);
      } catch (error) {
        send({ type: 'error', jobId, message: error instanceof Error ? error.message : String(error) });
      }
    });
  });
}
