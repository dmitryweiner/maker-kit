// Browser smoke of the showcase: it opens at phone and desktop width, has no
// horizontal scroll and no console errors. The checks of each component join
// as the components do (plans/PLAN.md, "Showcase").
//
//   npm run smoke               # dev server
//   npm run smoke -- --preview  # a fresh production build
//   npm run smoke -- --shots    # also saves shots/<viewport>.png
//
// Prints one line per step; exits 1 on the first failed step or on any
// console error. New checks are new steps here, not new scripts.

import { mkdirSync } from 'node:fs';
import { check, horizontalOverflow, launch, parseArgs, VIEWPORTS } from './harness.mjs';

/** The kit's own ports (other projects: case-constructor 53xx/43xx, plate-builder 5373, cast-builder 5291). */
const PORTS = { dev: 5395, preview: 4395 };

const flags = parseArgs(process.argv.slice(2));
const shots = flags.has('shots');
const app = await launch({ preview: flags.has('preview'), ports: PORTS });

async function step(name, fn) {
  app.label(name);
  await fn();
  console.log(`ok  ${name}`);
}

try {
  for (const [name, viewport] of Object.entries(VIEWPORTS)) {
    await step(`the showcase opens on a ${name}`, async () => {
      const { page, context } = await app.open({ viewport });
      check((await page.locator('h1').textContent()) === 'maker-kit', 'no heading');
      const overflow = await horizontalOverflow(page);
      check(overflow <= 0, `scrolls sideways by ${overflow} px`);
      if (shots) {
        mkdirSync('shots', { recursive: true });
        await page.screenshot({ path: `shots/${name}.png`, fullPage: true });
      }
      await context.close();
    });
  }
  await step('− and + step by a click and repeat while held, each one undo step', async () => {
    const { page, context } = await app.open();
    const width = () => page.inputValue('#demo_width_n');
    await page.click('#demo_width_inc');
    check((await width()) === '60.5', `a click stepped to ${await width()}`);
    const plus = page.locator('#demo_width_inc');
    const box = await plus.boundingBox();
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

  await step('a slider drag and a typed value are one step each; hidden and disabled rows', async () => {
    const { page, context } = await app.open();
    await page.fill('#demo_width_n', '1000');
    await page.press('#demo_width_n', 'Enter');
    check((await page.inputValue('#demo_width')) === '200', 'a typed value is not clamped');
    await page.click('#demo_shape_cylinder');
    check(await page.locator('#demo_height').isHidden(), 'the height of a cylinder is shown');
    check(await page.locator('#demo_walls_left').isDisabled(), 'a cylinder has a left wall');
    await page.check('#demo_locked');
    check(await page.locator('#demo_width_inc').isDisabled(), 'a locked width can be stepped');
    await page.click('#demo_spin_v90');
    check((await page.inputValue('#demo_spin_n')) === '90', 'a value button did not set the value');
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
