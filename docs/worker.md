# worker — heavy jobs off the main thread

## The main thread: worker/client

```ts
const client = new WorkerClient<Job, Result>(
  moduleWorker(() => new Worker(new URL('./csg.worker.ts', import.meta.url), { type: 'module' })),
  { lane: (job) => job.kind, kept: (job) => job.quality === 'export', transfer: (job) => [job.image.buffer] },
);
const done = await progress.track((onProgress) => client.run(job, onProgress));   // ui/progress
if (done) show(done.result, done.ms);   // null: a fresher job replaced this one
```

- One worker, started by the first job. A running job is never interrupted
  (WASM does not stop mid-boolean); a waiting one is replaced by a fresher
  one of its lane and resolves null — not an error.
- A kept job (an export asked for with a button) is never replaced by one
  that is not; lanes wait side by side in the order they first came.
- A crashed worker fails what runs and waits; the next job starts a fresh
  one. `dispose()` ends it.
- `moduleWorker` takes a function that makes the worker: Vite finds and
  bundles a worker only by `new Worker(new URL(…), …)` in the app's code.
  The app's `vite.config.ts` sets `worker: { format: 'es' }`.

## The worker: worker/serve

```ts
serveJobs<Job, Result>({
  isJob,                                   // what came through postMessage is checked
  async handle(job, progress) {
    progress({ step: 1, total: 3, label: { code: 'stage.shell' } });   // a message, translated when shown
    const mesh = build(job);
    return { result: mesh, transfer: [mesh.positions.buffer, mesh.indices.buffer] };
  },
});
```

Jobs run one at a time as they come; the reply carries the time from the
job's arrival (the first one's includes loading WASM); an error goes back
as its message.

## worker/protocol

`WorkerIn<J>` (`{ jobId, job }`), `WorkerOut<R>` (progress, done, error),
`isWorkerIn(data, isJob)`, `isWorkerOut(data)`.
