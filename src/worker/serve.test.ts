import { describe, expect, it } from 'vitest';
import type { JobProgress } from '../core/progress';
import { isWorkerIn, isWorkerOut } from './protocol';
import { serveJobs, type WorkerScope } from './serve';

type Job = { kind: 'box'; size: number };
const isJob = (job: unknown): job is Job =>
  typeof job === 'object' && job !== null && 'kind' in job && job.kind === 'box' && 'size' in job && typeof job.size === 'number';

/** A worker's global scope: the test sends jobs and reads the replies. */
function fakeScope() {
  let listener: ((event: MessageEvent) => void) | null = null;
  const sent: { message: unknown; transfer: Transferable[] }[] = [];
  const scope: WorkerScope = {
    addEventListener: (_type, l) => {
      listener = l;
    },
    postMessage: (message, options) => sent.push({ message, transfer: options.transfer }),
  };
  const send = (data: unknown) => listener?.(new MessageEvent('message', { data }));
  return { scope, sent, send };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('serveJobs', () => {
  it('runs a job and replies with its result, the time it took and the buffers to move', async () => {
    const { scope, sent, send } = fakeScope();
    let clock = 100;
    serveJobs<Job, { volume: number; data: ArrayBuffer }>({
      isJob,
      handle: (job) => {
        clock += 40;
        const data = new ArrayBuffer(4);
        return { result: { volume: job.size ** 3, data }, transfer: [data] };
      },
      scope,
      now: () => clock,
    });
    send({ jobId: 7, job: { kind: 'box', size: 2 } });
    await flush();
    expect(sent).toHaveLength(1);
    expect(sent[0]?.message).toMatchObject({ type: 'done', jobId: 7, result: { volume: 8 }, ms: 40 });
    expect(sent[0]?.transfer).toHaveLength(1);
    expect(isWorkerOut(sent[0]?.message)).toBe(true);
  });

  it('sends progress as it goes, its stage a message', async () => {
    const { scope, sent, send } = fakeScope();
    serveJobs<Job, string>({
      isJob,
      handle: async (job, progress: (p: JobProgress) => void) => {
        progress({ step: 1, total: 2, label: { code: 'stage.walls' } });
        await Promise.resolve();
        progress({ step: 2, total: 2 });
        return { result: `box ${job.size}` };
      },
      scope,
    });
    send({ jobId: 1, job: { kind: 'box', size: 3 } });
    await flush();
    expect(sent.map((s) => s.message)).toEqual([
      { type: 'progress', jobId: 1, step: 1, total: 2, label: { code: 'stage.walls' } },
      { type: 'progress', jobId: 1, step: 2, total: 2 },
      expect.objectContaining({ type: 'done', jobId: 1, result: 'box 3' }),
    ]);
  });

  it('replies with the error’s message when a job fails', async () => {
    const { scope, sent, send } = fakeScope();
    serveJobs<Job, string>({
      isJob,
      handle: () => {
        throw new Error('not manifold');
      },
      scope,
    });
    send({ jobId: 3, job: { kind: 'box', size: 1 } });
    await flush();
    expect(sent.map((s) => s.message)).toEqual([{ type: 'error', jobId: 3, message: 'not manifold' }]);
  });

  it('ignores what has no job id: there is nobody to answer', async () => {
    const { scope, sent, send } = fakeScope();
    serveJobs<Job, string>({ isJob, handle: () => ({ result: 'x' }), scope });
    send('hello');
    send({ jobId: 'one', job: { kind: 'box', size: 1 } });
    send({ job: { kind: 'box', size: 1 } });
    await flush();
    expect(sent).toEqual([]);
  });

  it('answers a job it refuses with an error: the client must not wait for it forever', async () => {
    const { scope, sent, send } = fakeScope();
    const handled: unknown[] = [];
    serveJobs<Job, string>({ isJob, handle: (job) => (handled.push(job), { result: 'x' }), scope });
    send({ jobId: 1, job: { kind: 'sphere' } });
    send({ jobId: 2 });
    await flush();
    expect(handled).toEqual([]);
    expect(sent.map((s) => s.message)).toEqual([
      { type: 'error', jobId: 1, message: 'the job is not one this worker takes' },
      { type: 'error', jobId: 2, message: 'the job is not one this worker takes' },
    ]);
  });
});

describe('the protocol’s guards', () => {
  it('take a job envelope only with a numeric id and a job of the worker', () => {
    expect(isWorkerIn({ jobId: 1, job: { kind: 'box', size: 1 } }, isJob)).toBe(true);
    expect(isWorkerIn({ jobId: 1 }, isJob)).toBe(false);
    expect(isWorkerIn(null, isJob)).toBe(false);
  });

  it('take a reply only in one of its three shapes', () => {
    expect(isWorkerOut({ type: 'progress', jobId: 1, step: 1, total: 2 })).toBe(true);
    expect(isWorkerOut({ type: 'progress', jobId: 1, step: 1, total: 2, label: { code: 'a' } })).toBe(true);
    expect(isWorkerOut({ type: 'progress', jobId: 1, step: 1, total: 2, label: 'text' })).toBe(false);
    expect(isWorkerOut({ type: 'done', jobId: 1, result: null, ms: 3 })).toBe(true);
    expect(isWorkerOut({ type: 'done', jobId: 1, result: null })).toBe(false);
    expect(isWorkerOut({ type: 'error', jobId: 1, message: 'x' })).toBe(true);
    expect(isWorkerOut({ type: 'error', jobId: 1 })).toBe(false);
    expect(isWorkerOut({ type: 'other', jobId: 1 })).toBe(false);
  });
});
