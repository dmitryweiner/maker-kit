// A dialog over everything, one at a time: the presets, an about box. Esc
// and a click on the backdrop close it; the focus goes in and, on close,
// back to what opened it; Tab stays inside. Never `alert` or `confirm` —
// they block the page and the smoke. Our own markup rather than <dialog>:
// `.modal` (the backdrop, hidden) holding `.modal-box`.

let current: { close(): void } | null = null;

/** Whether a dialog is open: the app's own shortcuts wait while one is. */
export function modalOpen(): boolean {
  return current !== null;
}

export interface ModalOptions {
  /** the ✕ in its corner */
  close?: HTMLButtonElement;
  onClose?(): void;
}

export interface ModalHandle {
  /** `opener` gets the focus back on close and `aria-expanded` while open */
  open(opener?: HTMLElement): void;
  close(): void;
  isOpen(): boolean;
}

const FOCUSABLE =
  'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])';

export function createModal(backdrop: HTMLElement, o: ModalOptions = {}): ModalHandle {
  let opener: HTMLElement | null = null;
  // in the document's order: jsdom lists a selector list's matches selector by selector
  const focusable = (): HTMLElement[] =>
    [...backdrop.querySelectorAll<HTMLElement>(FOCUSABLE)].toSorted((a, b) =>
      a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
    );

  const onKey = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      handle.close();
      return;
    }
    if (event.key !== 'Tab') return;
    const nodes = focusable();
    const first = nodes[0];
    const last = nodes.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };
  // in the capture phase on the window: the dialog's keys come before any of the app's
  const listen = (on: boolean): void => {
    if (on) window.addEventListener('keydown', onKey, true);
    else window.removeEventListener('keydown', onKey, true);
  };

  const handle: ModalHandle = {
    open(by) {
      if (current === handle) return;
      current?.close();
      current = handle;
      opener = by ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
      by?.setAttribute('aria-expanded', 'true');
      backdrop.hidden = false;
      listen(true);
      (backdrop.querySelector<HTMLElement>('[autofocus]') ?? o.close ?? focusable()[0])?.focus();
    },
    close() {
      if (current !== handle) return;
      current = null;
      backdrop.hidden = true;
      listen(false);
      opener?.setAttribute('aria-expanded', 'false');
      opener?.focus();
      opener = null;
      o.onClose?.();
    },
    isOpen: () => current === handle,
  };

  o.close?.addEventListener('click', () => handle.close());
  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) handle.close();
  });
  return handle;
}
