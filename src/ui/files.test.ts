// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { download, pickFile } from './files';

afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

describe('download', () => {
  it('clicks a link to a blob of the data with the file name, then lets the URL go', async () => {
    const created: Blob[] = [];
    const revoked: string[] = [];
    const urls = { create: (blob: Blob) => (created.push(blob), 'blob:1'), revoke: (url: string) => void revoked.push(url) };
    let clicked: { href: string; download: string } | null = null;
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicked = { href: this.href, download: this.download };
    });
    download('door-sign.plate.json', '{"a":1}', 'application/json', urls);
    expect(clicked).toEqual({ href: 'blob:1', download: 'door-sign.plate.json' });
    expect(created[0]?.type).toBe('application/json');
    expect(await created[0]?.text()).toBe('{"a":1}');
    expect(document.querySelector('a')).toBeNull();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(revoked).toEqual(['blob:1']);
  });

  it('takes bytes as they are (an STL)', async () => {
    const created: Blob[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    download('a.stl', new Uint8Array([1, 2, 3]).buffer, 'model/stl', { create: (b) => (created.push(b), 'blob:2'), revoke: () => {} });
    expect([...new Uint8Array(await (created[0] ?? new Blob()).arrayBuffer())]).toEqual([1, 2, 3]);
  });
});

describe('pickFile', () => {
  it('opens the file dialog for the given types and gives the chosen file', async () => {
    const inputs: HTMLInputElement[] = [];
    vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(function (this: HTMLInputElement) {
      inputs.push(this);
    });
    const picked = pickFile('.json,application/json');
    const [chosen] = inputs;
    if (!chosen) throw new Error('no dialog opened');
    expect([chosen.type, chosen.accept]).toEqual(['file', '.json,application/json']);
    const file = new File(['{}'], 'p.json');
    Object.defineProperty(chosen, 'files', { value: [file] });
    chosen.dispatchEvent(new Event('change'));
    expect(await picked).toBe(file);
  });

  it('gives null when the dialog is cancelled', async () => {
    const inputs: HTMLInputElement[] = [];
    vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(function (this: HTMLInputElement) {
      inputs.push(this);
    });
    const picked = pickFile('.stl');
    inputs[0]?.dispatchEvent(new Event('cancel'));
    expect(await picked).toBeNull();
  });
});
