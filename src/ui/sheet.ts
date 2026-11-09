// The panel as a bottom sheet on a phone (Cast Builder's, with Plate
// Builder's close button and change callback). The view fills the screen and
// the sheet lies over its lower part; the ⚙ button opens it, its handle or a
// tap on the view closes it. On a wide screen the panel stands beside the
// view and none of this applies: the CSS ignores `.open` there and the
// button stays hidden.
//
// The view under the open sheet stays live — a drag turns the model, a
// pinch zooms it; only a tap (one finger, short, still) closes the sheet.

/** The part of `MediaQueryList` used here — a test passes its own. */
export interface NarrowQuery {
  readonly matches: boolean;
  addEventListener(type: 'change', listener: () => void): void;
}

export interface SheetOptions {
  panel: HTMLElement;
  /** "Settings": opens the closed sheet */
  button: HTMLButtonElement;
  /** the handle: closes it from inside */
  close?: HTMLButtonElement;
  /** the view: a tap on it closes the sheet; drags and pinches pass to it */
  view?: HTMLElement;
  /** true where the panel is a sheet: `matchMedia('(max-width: 1023px)')` */
  narrow: NarrowQuery;
  /** whether it starts open (it does by default) */
  open?: boolean;
  /** how much of the view's bottom it covers, px: the 3D view centres the model above it */
  onInset?(px: number): void;
  /** after it opens or closes */
  onChange?(): void;
}

export interface SheetHandle {
  open(): void;
  close(): void;
  isOpen(): boolean;
  /** reports the inset again — after a resize: the sheet's height follows the window */
  refresh(): void;
}

const TAP_MOVE_PX = 6;
const TAP_MS = 300;

export function setupSheet(o: SheetOptions): SheetHandle {
  const { panel, button, narrow } = o;
  let open = o.open ?? true;

  const apply = (): void => {
    panel.classList.toggle('open', open);
    button.hidden = open || !narrow.matches;
    button.setAttribute('aria-expanded', String(open));
    o.onInset?.(open && narrow.matches ? panel.offsetHeight : 0);
  };
  const set = (next: boolean): void => {
    if (next === open) return;
    open = next;
    apply();
    o.onChange?.();
  };

  const { view } = o;
  if (view) {
    const pressed = new Map<number, { x: number; y: number; t: number }>();
    let gesture = false;
    const moved = (event: PointerEvent, start: { x: number; y: number }) =>
      Math.hypot(event.clientX - start.x, event.clientY - start.y) > TAP_MOVE_PX;
    view.addEventListener('pointerdown', (event) => {
      pressed.set(event.pointerId, { x: event.clientX, y: event.clientY, t: event.timeStamp });
      if (pressed.size > 1) gesture = true;
    });
    view.addEventListener('pointermove', (event) => {
      const start = pressed.get(event.pointerId);
      if (start && moved(event, start)) gesture = true;
    });
    view.addEventListener('pointerup', (event) => {
      const start = pressed.get(event.pointerId);
      pressed.delete(event.pointerId);
      const tap = start !== undefined && !gesture && event.timeStamp - start.t < TAP_MS && !moved(event, start);
      if (pressed.size === 0) gesture = false;
      if (tap && narrow.matches) set(false);
    });
    view.addEventListener('pointercancel', (event) => {
      pressed.delete(event.pointerId);
      if (pressed.size === 0) gesture = false;
    });
  }

  button.addEventListener('click', () => set(true));
  o.close?.addEventListener('click', () => set(false));
  narrow.addEventListener('change', apply);
  apply();

  return { open: () => set(true), close: () => set(false), isOpen: () => open, refresh: apply };
}
