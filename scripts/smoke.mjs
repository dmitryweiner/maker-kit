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
  check(app.errors.length === 0, `console errors:\n${app.errors.join('\n')}`);
  console.log('smoke passed');
} catch (error) {
  console.error(`FAIL ${error instanceof Error ? error.message : String(error)}`);
  if (app.errors.length) console.error(app.errors.join('\n'));
  process.exitCode = 1;
} finally {
  await app.close();
}
