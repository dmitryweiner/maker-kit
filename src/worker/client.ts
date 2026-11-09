// The main thread's side of a job worker (Plate Builder's generic client):
// one worker, created lazily, and a queue one job deep per lane.
//
// A running job cannot be interrupted — WASM does not stop mid-boolean. A
// waiting one can be replaced, which is exactly what a preview needs: while
// a slider moves, only the freshest request matters. A replaced job resolves
// to null — "no longer wanted", not an error: a rejection would have to be
// caught and told apart from a real failure on every call. A kept job (an
// export asked for with a button) is never replaced by one that is not.
//
// Lanes (an outline, a mesh) wait side by side, so a mesh request never
// pushes out an outline request; they run in the order they first came. A
// crashed worker fails what waits, and the next job starts a fresh one.

import type { JobProgress } from '../core/progress';
import { isWorkerOut, type WorkerIn } from './protocol';

export interface JobDone<R> {
  result: R;
  /** time the worker spent on the job */
  ms: number;
}

/** How jobs share the queue. */
export interface JobPolicy<J> {
  /** waiting jobs of one lane replace each other */
  lane(job: J): string;
  /** a job asked for with a button: one that is not kept never replaces it */
  kept(job: J): boolean;
  /** buffers moved to the worker instead of copied */
  transfer?(job: J): Transferable[];
}

export interface WorkerHandle<J> {
  post(message: WorkerIn<J>, transfer: Transferable[]): void;
  terminate(): void;
}

/** Starts a worker that calls `receive` with each reply and `broke` when the worker itself fails. */
export type WorkerFactory<J> = (receive: (data: unknown) => void, broke: (message: string) => void) => WorkerHandle<J>;

/**
 * A module worker as a factory. `create` is the app's own
 * `() => new Worker(new URL('./csg.worker.ts', import.meta.url), { type: 'module' })`:
 * Vite finds and bundles a worker only by that expression in the app's code.
 */
export function moduleWorker<J>(create: () => Worker): WorkerFactory<J> {
  return (receive, broke) => {
    const worker = create();
    worker.addEventListener('message', (event) => receive(event.data));
    worker.addEventListener('error', (event) => broke(event.message || 'the worker failed to start'));
    worker.addEventListener('messageerror', () => broke('the worker reply is unreadable'));
    return { post: (message, transfer) => worker.postMessage(message, transfer), terminate: () => worker.terminate() };
  };
}

interface Pending<J, R> {
  id: number;
  job: J;
  onProgress?: (progress: JobProgress) => void;
  settle(result: JobDone<R> | null): void;
  fail(message: string): void;
}

export class WorkerClient<J, R> {
  private worker: WorkerHandle<J> | null = null;
  private nextId = 1;
  private running: Pending<J, R> | null = null;
  /** one waiting job per lane, in the order the lanes first got one */
  private waiting = new Map<string, Pending<J, R>>();

  constructor(
    private readonly factory: WorkerFactory<J>,
    private readonly policy: JobPolicy<J>,
  ) {}

  /** null: a fresher job replaced this one. */
  run(job: J, onProgress?: (progress: JobProgress) => void): Promise<JobDone<R> | null> {
    return new Promise((resolve, reject) => {
      const pending: Pending<J, R> = { id: this.nextId++, job, onProgress, settle: resolve, fail: (message) => reject(new Error(message)) };
      if (!this.running) {
        this.start(pending);
        return;
      }
      const lane = this.policy.lane(job);
      const waiting = this.waiting.get(lane);
      if (waiting && this.policy.kept(waiting.job) && !this.policy.kept(job)) {
        resolve(null);
        return;
      }
      waiting?.settle(null);
      // a replaced lane keeps its place in the order
      this.waiting.set(lane, pending);
    });
  }

  /** Ends the worker; what runs or waits fails. */
  dispose(): void {
    this.broke('the worker client was disposed');
  }

  private start(pending: Pending<J, R>): void {
    this.running = pending;
    this.ensure().post({ jobId: pending.id, job: pending.job }, this.policy.transfer?.(pending.job) ?? []);
  }

  private next(): void {
    this.running = null;
    const [first] = this.waiting;
    if (!first) return;
    this.waiting.delete(first[0]);
    this.start(first[1]);
  }

  private receive(data: unknown): void {
    if (!isWorkerOut<R>(data)) return;
    const running = this.running;
    // a reply to a job nobody waits for any more: dropped
    if (!running || running.id !== data.jobId) return;
    if (data.type === 'progress') {
      running.onProgress?.(data.label ? { step: data.step, total: data.total, label: data.label } : { step: data.step, total: data.total });
      return;
    }
    if (data.type === 'done') running.settle({ result: data.result, ms: data.ms });
    else running.fail(data.message);
    this.next();
  }

  /** The worker itself broke: the module did not load, WASM crashed. */
  private broke(message: string): void {
    this.running?.fail(message);
    for (const waiting of this.waiting.values()) waiting.fail(message);
    this.waiting.clear();
    this.running = null;
    // the next job starts a fresh worker: a one-off failure must not bury the app until a reload
    this.worker?.terminate();
    this.worker = null;
  }

  private ensure(): WorkerHandle<J> {
    this.worker ??= this.factory(
      (data) => this.receive(data),
      (message) => this.broke(message),
    );
    return this.worker;
  }
}
