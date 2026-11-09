// Browser smoke of the showcase: at phone and desktop width, in each accent
// and language (Hebrew mirrored), no horizontal scroll and no console
// errors; the sheet, the dialog, the banner and the bar over the view in
// their states; the worker's mesh in the viewer and the STL export; the
// panel's −/+, undo keys, the presets flow in a real browser. With --shots
// it saves a screenshot of every state for a design review.
//
//   npm run smoke               # dev server
//   npm run smoke -- --preview  # a fresh production build
//   npm run smoke -- --shots    # also saves shots/<viewport>-<accent>-<lang>.png and the states
//
// Prints one line per step; exits 1 on the first failed step or on any
// console error. New checks are new steps here, not new scripts.

import { mkdirSync } from 'node:fs';
import { check, horizontalOverflow, launch, parseArgs, VIEWPORTS } from './harness.mjs';

/** The kit's own ports (other projects: case-constructor 53xx/43xx, plate-builder 5373, cast-builder 5291). */
const PORTS = { dev: 5395, preview: 4395 };
const ACCENTS = ['cyan', 'emerald', 'burgundy'];
const LANGS = ['en', 'ru', 'uk', 'he'];

const flags = parseArgs(process.argv.slice(2));
const shots = flags.has('shots');
const app = await launch({ preview: flags.has('preview'), ports: PORTS });
if (shots) mkdirSync('shots', { recursive: true });

async function step(name, fn) {
  app.label(name);
  await fn();
  console.log(`ok  ${name}`);
}

/**
 * Waits for CSS transitions to end: on the dev server the styles come after
 * the first paint, so the closed sheet is still sliding away at `load`.
 */
async function settled(page) {
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a instanceof CSSTransition)
        .map((a) => a.finished),
    ),
  );
}

/** Opens the showcase in a state; checks it does not scroll sideways; saves a shot with --shots. */
async function state(viewportName, query, shot) {
  const { page, context } = await app.open({ viewport: VIEWPORTS[viewportName], path: `?${query}` });
  await settled(page);
  const overflow = await horizontalOverflow(page);
  check(overflow <= 0, `${query} on a ${viewportName} scrolls sideways by ${overflow} px`);
  if (shots) await page.screenshot({ path: `shots/${shot}.png` });
  return { page, context };
}

try {
  await step('every accent and language at phone and desktop width', async () => {
    for (const viewport of Object.keys(VIEWPORTS))
      for (const accent of ACCENTS)
        for (const lang of LANGS) {
          const { page, context } = await state(viewport, `accent=${accent}&lang=${lang}`, `${viewport}-${accent}-${lang}`);
          check((await page.getAttribute('html', 'dir')) === (lang === 'he' ? 'rtl' : 'ltr'), `${lang}: wrong direction`);
          check((await page.getAttribute('html', 'data-accent')) === accent, `${accent} not set`);
          await context.close();
        }
  });

  await step('the panel: beside the view on a desktop, a closed sheet on a phone', async () => {
    const desktop = await state('desktop', 'lang=en', 'desktop-panel');
    const panel = await desktop.page.locator('#panel').boundingBox();
    check(panel && panel.x < 5 && panel.width > 300, `the desktop panel is not on the start side: ${JSON.stringify(panel)}`);
    check(await desktop.page.locator('#sheetOpen').isHidden(), 'a desktop shows the settings button');
    await desktop.context.close();
    const rtl = await state('desktop', 'lang=he', 'desktop-panel-he');
    const rtlPanel = await rtl.page.locator('#panel').boundingBox();
    check(rtlPanel && rtlPanel.x + rtlPanel.width > VIEWPORTS.desktop.width - 5, 'the panel is not on the start side in Hebrew');
    await rtl.context.close();

    const phone = await state('phone', 'lang=en', 'phone-closed');
    check(await phone.page.locator('#sheetOpen').isVisible(), 'a phone has no settings button');
    const onTop = await phone.page.evaluate(() => {
      const button = document.getElementById('sheetOpen');
      const r = button?.getBoundingClientRect();
      return r ? document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) === button : false;
    });
    check(onTop, 'something covers the settings button (the closed sheet?)');
    await phone.page.click('#sheetOpen');
    await settled(phone.page);
    const sheet = await phone.page.locator('#panel').boundingBox();
    check(
      sheet && sheet.y > 100 && sheet.y + sheet.height <= VIEWPORTS.phone.height + 1,
      `the sheet is not at the bottom: ${JSON.stringify(sheet)}`,
    );
    if (shots) await phone.page.screenshot({ path: 'shots/phone-sheet-open.png' });
    await phone.page.click('#sheetClose');
    await phone.context.close();
  });

  await step('the sheet, the dialog, the bar and the banner in their states', async () => {
    for (const [viewport, query, shot] of [
      ['phone', 'sheet=open&lang=ru', 'phone-sheet-ru'],
      ['phone', 'sheet=open&lang=he&accent=burgundy', 'phone-sheet-he-burgundy'],
      ['phone', 'modal=presets', 'phone-presets'],
      ['desktop', 'modal=presets&lang=uk&accent=emerald', 'desktop-presets-uk'],
      ['phone', 'progress=running&banner=full', 'phone-progress-banner'],
      ['desktop', 'progress=label&banner=blocked&lang=ru', 'desktop-progress-label-ru'],
      ['desktop', 'frame=phone&accent=emerald', 'desktop-phone-frame'],
    ]) {
      const { context } = await state(viewport, query, shot);
      await context.close();
    }
  });

  await step('the 3D view: the box comes from the worker, the chips turn the camera', async () => {
    const { page, context } = await app.open();
    check(await page.isVisible('#viewCanvas'), 'no WebGL view (the SVG stand-in shows)');
    await page.waitForSelector('#view[data-triangles="12"]', { timeout: 10000 });
    await page.click('.chip[data-view="top"]');
    check((await page.getAttribute('.chip[data-view="top"]', 'aria-pressed')) === 'true', 'Top is not pressed');
    check((await page.getAttribute('.chip[data-view="iso"]', 'aria-pressed')) === 'false', 'Iso stays pressed');
    if (shots) {
      await page.waitForTimeout(300);
      await page.screenshot({ path: 'shots/desktop-view-top.png' });
      await page.click('.chip[data-view="front"]');
      await page.waitForTimeout(300);
      await page.screenshot({ path: 'shots/desktop-view-front.png' });
    }
    await context.close();
  });

  await step('the export: a kept job under a labelled bar, a checked mesh, an STL file', async () => {
    const { page, context } = await app.open();
    await page.waitForSelector('#view[data-triangles]');
    const [file] = await Promise.all([page.waitForEvent('download'), page.click('#downloadStl')]);
    check(file.suggestedFilename() === 'my-box.stl', `the file is named ${file.suggestedFilename()}`);
    const path = await file.path();
    const { statSync } = await import('node:fs');
    check(statSync(path).size === 84 + 12 * 50, `the STL has ${statSync(path).size} bytes`);
    await context.close();
  });

  await step('the progress bar: a quick job never shows it, two overlapping ones show one bar', async () => {
    const { page, context } = await app.open();
    await page.click('#jobsQuick');
    await page.waitForTimeout(500);
    check(await page.locator('#viewProgress').isHidden(), 'a quick job showed the bar');
    await page.click('#jobsTwo');
    await page.waitForTimeout(1600);
    check(await page.locator('#viewProgress').isVisible(), 'the bar went with the first of two jobs');
    await page.waitForTimeout(1000);
    check(await page.locator('#viewProgress').isHidden(), 'the bar stayed after both jobs');
    await context.close();
  });

  await step('− and + step by a click and repeat while held, each one undo step', async () => {
    const { page, context } = await app.open();
    const width = () => page.inputValue('#demo_width_n');
    await page.click('#demo_width_inc');
    check((await width()) === '60.5', `a click stepped to ${await width()}`);
    const box = await page.locator('#demo_width_inc').boundingBox();
    check(box, 'no + button');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(1000);
    await page.mouse.up();
    const held = Number(await width());
    check(held >= 62.5, `a hold of 1 s stepped only to ${held}`);
    await page.click('#undo');
    check((await width()) === '60.5', `undo after a hold went to ${await width()}, not to before it`);
    await page.click('#undo');
    check((await width()) === '60', `undo after a click went to ${await width()}`);
    await context.close();
  });

  await step('typed values, hidden, disabled and limit states, value buttons', async () => {
    const { page, context } = await app.open();
    await page.fill('#demo_width_n', '1000');
    await page.press('#demo_width_n', 'Enter');
    check((await page.inputValue('#demo_width')) === '200', 'a typed value is not clamped');
    await page.click('#demo_shape_cylinder');
    check(await page.locator('#demo_height').isHidden(), 'the height of a cylinder is shown');
    check(await page.locator('#demo_walls_left').isDisabled(), 'a cylinder has a left wall');
    check(await page.locator('#state_wall_inc').isDisabled(), '+ at the maximum is enabled');
    check(await page.locator('#state_computed_inc').isDisabled(), 'a computed width can be stepped');
    await page.uncheck('#state_locked');
    check(await page.locator('#state_computed_dec').isEnabled(), 'an unlocked width cannot be stepped');
    await page.click('#demo_spin_v90');
    check((await page.inputValue('#demo_spin_n')) === '90', 'a value button did not set the value');
    await context.close();
  });

  await step('undo: Ctrl+Z right after a slider, not in a text field; one step per drag', async () => {
    const { page, context } = await app.open();
    const slider = page.locator('#demo_width');
    await slider.focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    check((await page.inputValue('#demo_width_n')) === '61', `the arrows moved to ${await page.inputValue('#demo_width_n')}`);
    await page.keyboard.press('Control+z');
    check((await page.inputValue('#demo_width_n')) === '60.5', 'Ctrl+Z after a slider did not undo');
    await page.keyboard.press('Control+Shift+z');
    check((await page.inputValue('#demo_width_n')) === '61', 'Ctrl+Shift+Z did not redo');
    await page.keyboard.press('Control+z');
    await page.click('#demo_name');
    await page.keyboard.type('!');
    await page.keyboard.press('Control+z');
    check((await page.inputValue('#demo_width_n')) === '60.5', 'Ctrl+Z in a text field undid the app');
    await context.close();
  });

  await step('presets: 💾 saves, a built-in one opens as one undo step, “changed”, two-tap delete, 📄 new, Esc', async () => {
    const { page, context } = await app.open();
    await page.fill('#demo_name', 'Lid test');
    await page.press('#demo_name', 'Enter');
    await page.click('#savePreset');
    await page.click('#presetsOpen');
    check(await page.isVisible('#presets'), 'the dialog did not open');
    check((await page.locator('#presetList .preset-row[data-ref^="u:"]').count()) === 2, 'the saved preset is not listed');
    await page.click('.preset-row[data-ref="b:pi"] .preset-pick');
    check(await page.isHidden('#presets'), 'opening a preset left the dialog open');
    check((await page.inputValue('#demo_width_n')) === '95', 'the preset did not open');
    await page.click('#demo_width_inc');
    check((await page.locator('#presetsOpen.changed').count()) === 1, 'an edited preset is not marked changed');
    await page.click('#undo');
    await page.click('#undo');
    check((await page.inputValue('#demo_name')) === 'Lid test', 'undo did not bring the project before the preset back');
    await page.click('#presetsOpen');
    const remove = page.locator('.preset-row[data-ref="u:u2"] .preset-delete');
    await remove.click();
    check((await remove.textContent()) === 'Delete?', 'delete did not ask');
    await remove.click();
    check((await page.locator('.preset-row[data-ref="u:u2"]').count()) === 0, 'the second tap did not delete');
    await page.keyboard.press('Escape');
    check(await page.isHidden('#presets'), 'Esc did not close the dialog');
    check(await page.evaluate(() => document.activeElement?.id === 'presetsOpen'), 'the focus did not come back to the opener');
    await page.click('#newProject');
    check((await page.locator('#presetsOpen').textContent()) === 'New box', '📄 did not open the blank preset');
    await context.close();
  });

  await step('a tap on the view closes the sheet; a drag on it does not', async () => {
    const { page, context } = await app.open({ viewport: VIEWPORTS.phone, path: '?sheet=open' });
    await settled(page);
    await page.mouse.move(195, 200);
    await page.mouse.down();
    await page.mouse.move(260, 220, { steps: 5 });
    await page.mouse.up();
    check((await page.locator('#panel.open').count()) === 1, 'a drag on the view closed the sheet');
    await page.mouse.click(195, 200);
    await settled(page);
    check((await page.locator('#panel.open').count()) === 0, 'a tap on the view did not close the sheet');
    await context.close();
  });

  await step('a language switch keeps the cards folded as they were', async () => {
    const { page, context } = await app.open();
    await page.click('#card_lid .fcard-head');
    await page.click('#card_vents .fcard-head');
    await page.selectOption('.lang-field select', 'he');
    check((await page.getAttribute('html', 'dir')) === 'rtl', 'Hebrew is not mirrored');
    check((await page.locator('#card_lid.collapsed').count()) === 1, 'the lid card unfolded on a language switch');
    check((await page.locator('#card_vents.collapsed').count()) === 0, 'the vents card folded on a language switch');
    await context.close();
  });

  check(app.errors.length === 0, `console errors:\n${app.errors.join('\n')}`);
  console.log('smoke passed');
} catch (error) {
  console.error(`FAIL ${error instanceof Error ? error.message : String(error)}`);
  if (app.errors.length) console.error(app.errors.join('\n'));
  process.exitCode = 1;
} finally {
  await app.close();
}
