import type { BrowserContext, Page } from 'playwright';

export interface Viewport {
  width: number;
  height: number;
}

export const VIEWPORTS: { phone: Viewport; desktop: Viewport };

export function parseArgs(argv: readonly string[], valueFlags?: readonly string[]): Map<string, string>;

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

export interface Harness {
  base: string;
  errors: string[];
  open(o?: OpenOptions): Promise<{ page: Page; context: BrowserContext }>;
  label(step: string): void;
  close(): Promise<void>;
}

export function launch(o: { preview?: boolean; ports: Ports }): Promise<Harness>;

export function check(condition: unknown, message: string): asserts condition;

export function horizontalOverflow(page: Page): Promise<number>;
