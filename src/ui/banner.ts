// The banner under the top bar that says what the browser's storage failed
// to keep (Case Constructor's storage note): the project, for as long as it
// fails — the work is at stake; and a preset that could not be saved or
// deleted, until dismissed or done. Red when nothing is kept (blocked), in
// the warn colour when the storage is full (deleting something helps).
//
// The kit says what failed; what to do is the app's to say (`advice`): an
// app with a project file passes `kit.storage.advice.file*` ("save the
// project to a file with ⬇️"), one with none its own words.

import type { Translate } from '../core/message';
import type { StorageWrite } from '../core/storage';
import type { KitKey } from '../i18n/index';
import { make } from './dom';

export interface StorageStatus {
  /** the last write of the project */
  project: StorageWrite;
  /** the last preset action that failed; null once one works or the note is dismissed */
  preset: { action: 'save' | 'delete'; result: Exclude<StorageWrite, 'ok'> } | null;
}

export interface StorageNote {
  key: KitKey;
  /** the project's failure is followed by the app's advice for it */
  advice: Exclude<StorageWrite, 'ok'> | null;
  /** a preset's failure is an event and may be dismissed; the project's is a state and stays */
  dismiss: boolean;
  /** nothing is kept at all */
  bad: boolean;
}

export function storageNotes(status: StorageStatus): StorageNote[] {
  const notes: StorageNote[] = [];
  if (status.project !== 'ok') {
    const full = status.project === 'full';
    notes.push({
      key: full ? 'kit.storage.project.full' : 'kit.storage.project.blocked',
      advice: status.project,
      dismiss: false,
      bad: !full,
    });
  }
  const { preset } = status;
  if (preset) {
    const key: KitKey =
      preset.action === 'delete'
        ? 'kit.storage.preset.delete'
        : preset.result === 'full'
          ? 'kit.storage.preset.saveFull'
          : 'kit.storage.preset.save';
    notes.push({ key, advice: null, dismiss: true, bad: preset.result === 'blocked' });
  }
  return notes;
}

export interface BannerOptions<K extends string> {
  t: Translate<NoInfer<K> | KitKey>;
  /** what to do when the project is not kept: the app's keys, or the kit's `kit.storage.advice.file` and `.fileFull` */
  advice: { blocked: K; full: K };
  onDismiss(): void;
}

export function renderBanner<K extends string>(banner: HTMLElement, status: StorageStatus, o: BannerOptions<K>): void {
  const notes = storageNotes(status);
  banner.setAttribute('role', 'status');
  banner.classList.toggle(
    'bad',
    notes.some((note) => note.bad),
  );
  banner.replaceChildren(
    ...notes.map((note) => {
      const line = make('div', 'banner-line');
      const text = note.advice ? `${o.t(note.key)} ${o.t(o.advice[note.advice])}` : o.t(note.key);
      line.append(make('span', undefined, text));
      if (note.dismiss) {
        const dismiss = make('button', 'link-button', o.t('kit.storage.dismiss'));
        dismiss.type = 'button';
        dismiss.addEventListener('click', () => o.onDismiss());
        line.append(dismiss);
      }
      return line;
    }),
  );
  banner.hidden = notes.length === 0;
}
