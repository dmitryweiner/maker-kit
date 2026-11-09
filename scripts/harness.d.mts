import type { BrowserContext, Page } from 'playwright';

export interface Viewport {
  width: number;
  height: number;
}

export const VIEWPORTS: { phone: Viewport; desktop: Viewport };

/** A bare flag is `'true'`, a value flag its value, a repeatable flag the list of its values. */
export function parseArgs(
  argv: readonly string[],
  valueFlags?: readonly string[],
  repeatableFlags?: readonly string[],
): Map<string, string | string[]>;

/** The project's own pair of ports: dev and preview, used with --strictPort. */
export interface Ports {
  dev: number;
  preview: number;
}

export function ensureServer(o: { preview: boolean; ports: Ports }): Promise<{ base: string; proc: { kill(): void } | null }>;

export interface OpenOptions {
  locale?: string;
  viewport?: Viewport;
  /** localStorage entries set where nothing is stored yet */
  storage?: Readonly<Record<string, string>> | null;
  /** run in every page before its own scripts */
  script?: (() => void) | null;
  /** the page under the base */
  path?: string;
}

export interface Steps {
  /** Labels the errors of the step and prints `ok  name (ms)`. */
  step: (name: string, fn: () => Promise<void>) => Promise<void>;
}

export interface Harness extends Steps {
  base: string;
  errors: string[];
  open(o?: OpenOptions): Promise<{ page: Page; context: BrowserContext }>;
  label(step: string): void;
  close(): Promise<void>;
  /**
   * Runs the steps; fails on the first failed one or on any console error;
   * prints `done` (default `smoke passed`) or `FAIL …`, closes the browser
   * and the server, sets `process.exitCode`.
   */
  run(body: () => Promise<void>, done?: string): Promise<void>;
}

/** What `createSteps` needs of a harness. */
export interface StepsHost {
  errors: readonly string[];
  label(step: string): void;
  close(): Promise<void>;
}

/** The steps and the run of `launch`, apart from the browser; `run` gives the exit code. */
export function createSteps(
  app: StepsHost,
  out?: { log(line: string): void; error(line: string): void },
  now?: () => number,
): Steps & { run(body: () => Promise<void>, done?: string): Promise<0 | 1> };

export function launch(o: { preview?: boolean; ports: Ports }): Promise<Harness>;

export function check(condition: unknown, message: string): asserts condition;

export function horizontalOverflow(page: Page): Promise<number>;

/** Waits for the page's CSS transitions to end. */
export function settled(page: Page): Promise<void>;

/** Clicks `selector` and waits for the file it downloads. */
export function download(page: Page, selector: string, o?: { timeout?: number }): Promise<{ name: string; bytes: Buffer; path: string }>;

/** The header and triangle count of a binary STL, or null when its size does not match the count. */
export function binaryStl(bytes: Uint8Array): { header: string; triangles: number } | null;

/** Slows the page's CPU `rate` times (1 removes it). */
export function throttle(page: Page, rate: number): Promise<void>;
