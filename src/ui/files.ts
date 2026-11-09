// Files in and out of the page: a download of what the app made (a project
// file, an STL) and the browser's file dialog. The page's half of
// core/projectFile, which stays free of the DOM.

/** Object URLs: a parameter so tests see what was made and let go. */
export interface ObjectUrls {
  create(blob: Blob): string;
  revoke(url: string): void;
}

const browserUrls: ObjectUrls = { create: (blob) => URL.createObjectURL(blob), revoke: (url) => URL.revokeObjectURL(url) };

/** Saves `data` as a file named `name`: text (a project file) or bytes (an STL). */
export function download(
  name: string,
  data: string | ArrayBuffer,
  type = 'application/octet-stream',
  urls: ObjectUrls = browserUrls,
): void {
  const url = urls.create(new Blob([data], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  // the click starts the download asynchronously in some browsers: let the URL go after it
  setTimeout(() => urls.revoke(url), 0);
}

/** The file chosen in the browser's dialog, or null when it is closed without one. `accept`: `.json,application/json`. */
export function pickFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.addEventListener('change', () => resolve(input.files?.[0] ?? null), { once: true });
    input.addEventListener('cancel', () => resolve(null), { once: true });
    input.click();
  });
}
