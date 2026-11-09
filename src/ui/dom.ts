// Type-safe DOM helpers, no `as`.

/** The element with this id, of this kind; throws when the page has none (a typo, a stale id). */
export function el<T extends Element>(id: string, ctor: abstract new () => T): T {
  const node = document.getElementById(id);
  if (!(node instanceof ctor)) throw new Error(`#${id} is not ${ctor.name}`);
  return node;
}

export function make<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
