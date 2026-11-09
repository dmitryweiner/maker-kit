import { describe, expect, it } from 'vitest';
import { History } from './history';

describe('History', () => {
  it('starts with nothing to undo or redo', () => {
    const h = new History({ a: 1 });
    expect([h.canUndo, h.canRedo]).toEqual([false, false]);
    expect(h.undo()).toBeNull();
    expect(h.redo()).toBeNull();
    expect(h.state).toEqual({ a: 1 });
  });

  it('undoes and redoes committed steps', () => {
    const h = new History({ n: 0 });
    h.commit({ n: 1 });
    h.commit({ n: 2 });
    expect(h.undo()).toEqual({ n: 1 });
    expect(h.undo()).toEqual({ n: 0 });
    expect(h.undo()).toBeNull();
    expect(h.redo()).toEqual({ n: 1 });
    expect(h.redo()).toEqual({ n: 2 });
    expect(h.canRedo).toBe(false);
    expect(h.state).toEqual({ n: 2 });
  });

  it('makes a gesture one step: live frames, then the commit', () => {
    const h = new History({ x: 0 });
    for (const x of [1, 2, 3]) h.live({ x });
    expect(h.state).toEqual({ x: 3 });
    expect(h.canUndo).toBe(false);
    h.commit({ x: 4 });
    expect(h.undo()).toEqual({ x: 0 });
    expect(h.redo()).toEqual({ x: 4 });
  });

  it('ignores a commit that changes nothing, compared by value', () => {
    const h = new History({ x: 0 });
    h.live({ x: 1 });
    h.commit({ x: 0 });
    expect(h.canUndo).toBe(false);
    h.commit({ x: 0 });
    expect(h.canUndo).toBe(false);
  });

  it('drops the redo branch on a new step', () => {
    const h = new History(0);
    h.commit(1);
    h.undo();
    h.commit(2);
    expect(h.canRedo).toBe(false);
    expect(h.undo()).toBe(0);
  });

  it('has no redo during a gesture', () => {
    const h = new History(0);
    h.commit(1);
    h.undo();
    h.live(5);
    expect(h.canRedo).toBe(false);
    expect(h.redo()).toBeNull();
  });

  it('undo in the middle of a gesture cancels the gesture', () => {
    const h = new History(0);
    h.commit(1);
    h.live(5);
    expect(h.undo()).toBe(1);
    expect(h.undo()).toBe(0);
    expect(h.redo()).toBe(1);
  });

  it('keeps at most `limit` steps, 100 by default', () => {
    const h = new History(0, 3);
    for (let n = 1; n <= 10; n++) h.commit(n);
    let undone = 0;
    while (h.undo() !== null) undone++;
    expect(undone).toBe(3);
    expect(h.state).toBe(7);

    const long = new History(0);
    for (let n = 1; n <= 150; n++) long.commit(n);
    let steps = 0;
    while (long.undo() !== null) steps++;
    expect(steps).toBe(100);
  });

  it('replaces everything on reset', () => {
    const h = new History(0);
    h.commit(1);
    h.live(2);
    h.reset(9);
    expect([h.state, h.canUndo, h.canRedo]).toEqual([9, false, false]);
    h.commit(10);
    expect(h.undo()).toBe(9);
  });

  it('opening another project is one step: undo brings the old one back', () => {
    const h = new History({ name: 'mine', w: 50 });
    h.commit({ name: 'mine', w: 60 });
    h.commit({ name: 'Door sign', w: 160 });
    expect(h.undo()).toEqual({ name: 'mine', w: 60 });
  });
});
