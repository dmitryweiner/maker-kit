// The kit's own strings, English: the reference — `KitKey` comes from here,
// the other languages repeat it key for key. An app spreads them into its
// dictionaries (`export const en = { ...kitEn, ... }`), so its "every key in
// every language" test covers them too. Templates: core/format.

export const kitEn = {
  // − and + beside a slider (ui/controls): their aria-label names the row
  'kit.control.decrease': 'Decrease {label}',
  'kit.control.increase': 'Increase {label}',
  // the top bar: the tools' labels, in its order (docs/design.md)
  'kit.topbar.presets': 'Presets',
  'kit.topbar.new': 'New project',
  'kit.topbar.savePreset': 'Save as a preset',
  'kit.topbar.open': 'Open a project file',
  'kit.topbar.save': 'Save the project to a file',
  'kit.topbar.undo': 'Undo (Ctrl+Z)',
  'kit.topbar.redo': 'Redo (Ctrl+Shift+Z)',
  'kit.topbar.language': 'Language',
  // the panel as a bottom sheet on a phone (ui/sheet)
  'kit.sheet.open': 'Settings',
  'kit.sheet.close': 'Close the settings',
  'kit.modal.close': 'Close',
  // the presets dialog (ui/presetList)
  'kit.preset.mine': 'My presets',
  'kit.preset.builtIn': 'Built-in',
  'kit.preset.none': 'No presets of yours yet: save the project as one with 💾.',
  'kit.preset.changed': 'changed',
  'kit.preset.rename': 'Name of the preset',
  'kit.preset.delete': 'Delete “{name}”',
  'kit.preset.confirm': 'Delete?',
  // the bar over the view (ui/progress)
  'kit.progress.building': 'Building…',
  // a project file that cannot be opened (core/projectFile)
  'kit.file.broken': 'This file is not a readable project.',
  'kit.file.foreign': 'This file is not a project of this app.',
  'kit.file.newer': 'This project comes from a newer version of the app. Reload the page to get it.',
  // what the browser's storage failed to keep (core/storage, ui/banner)
  'kit.storage.project.blocked':
    'This browser does not keep your project: its storage is unavailable (a private window or blocked site data). Save the project to a file with ⬇️ before closing the page.',
  'kit.storage.project.full':
    'Your latest changes are not kept in this browser: its storage is full. Delete presets you no longer need, or save the project to a file with ⬇️.',
  'kit.storage.preset.save': 'Could not save the preset: the browser storage is unavailable.',
  'kit.storage.preset.saveFull': 'Could not save the preset: the browser storage is full. Delete presets you no longer need and try again.',
  'kit.storage.preset.delete': 'Could not delete the preset: the browser storage is unavailable.',
  'kit.storage.dismiss': 'Dismiss',
};

export type KitKey = keyof typeof kitEn;
export type KitMessages = Readonly<Record<KitKey, string>>;
