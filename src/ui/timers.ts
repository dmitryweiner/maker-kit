// Time as a parameter: components that wait or repeat take `Timers`, so
// tests run them on fake ones.

export interface Timers {
  set(fn: () => void, ms: number): number;
  clear(id: number): void;
}

export const browserTimers: Timers = {
  set: (fn, ms) => window.setTimeout(fn, ms),
  clear: (id) => window.clearTimeout(id),
};
