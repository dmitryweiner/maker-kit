// What a running job says about itself: steps done of how many, and what it
// is doing as a message (translated when shown). The worker sends it; the
// bar over the view (ui/progress) shows it.

import type { Message } from './message';

export interface JobProgress<C extends string = string> {
  step: number;
  total: number;
  /** what it is doing now: a stage of an export */
  label?: Message<C>;
}
