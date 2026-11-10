// A printed thread: its section (pure) and its rod and hole (the real WASM).
// Case Constructor's and Cast Builder's tests merged.

import { beforeAll, describe, expect, it } from 'vitest';
import type { Manifold } from 'manifold-3d';
import { CsgScope, initCSG, type CsgApi } from './manifold';
import { minorRadius, symmetricForm, threadHole, threadRod, threadSection, type ThreadForm } from './thread';

let csg: CsgApi;
beforeAll(async () => {
  csg = await initCSG();
});

const M10 = symmetricForm(10, 2);
const N = { points: 32, slicesPerTurn: 32 };

function twiceArea(points: readonly [number, number][]): number {
  let area = 0;
  points.forEach(([x0, y0], i) => {
    const [x1, y1] = points[(i + 1) % points.length]!;
    area += x0 * y1 - x1 * y0;
  });
  return area;
}

describe('the form', () => {
  it('symmetric: a 60° profile half a pitch deep, flanks at 30° from the radial', () => {
    expect(M10).toEqual({ d: 10, pitch: 2, depth: 0.5, rise: 0.5 * Math.tan(Math.PI / 6), fall: 0.5 * Math.tan(Math.PI / 6) });
    expect(minorRadius(M10)).toBeCloseTo(4);
  });
});

describe('threadSection', () => {
  it('runs between the minor and the major radius, grown by the fit, counter-clockwise', () => {
    for (const grow of [0, 0.35]) {
      const points = threadSection(M10, grow, 48);
      expect(points).toHaveLength(48);
      const radii = points.map(([x, y]) => Math.hypot(x, y));
      expect(Math.min(...radii)).toBeCloseTo(minorRadius(M10) + grow, 6);
      expect(Math.max(...radii)).toBeCloseTo(M10.d / 2 + grow, 6);
      expect(twiceArea(points)).toBeGreaterThan(0);
    }
  });

  it('the crest, the falling flank, the root, the rising flank in turn, each as wide as its share', () => {
    const form: ThreadForm = { d: 10, pitch: 2, depth: 0.5, rise: 0.4, fall: 0.2 };
    const radii = threadSection(form, 0, 100).map(([x, y]) => Math.hypot(x, y));
    // phase −θ / 2π: point i is at phase (100 − i) / 100; flats of (1 − 0.6) / 2 = 0.2 each
    const at = (phase: number) => radii[(100 - Math.round(phase * 100)) % 100]!;
    expect(at(0.1)).toBeCloseTo(5);
    expect(at(0.3)).toBeCloseTo(4.5);
    expect(at(0.5)).toBeCloseTo(4);
    expect(at(0.8)).toBeCloseTo(4.5);
  });
});

describe('threadRod', () => {
  it('turns counter-clockwise going up: a right-hand thread', () => {
    const scope = new CsgScope();
    const rod = threadRod(csg, scope, M10, 0, 0, 10, N);
    const slice = scope.keep(rod.slice(M10.pitch / 4));
    const section = scope.keep(new csg.CrossSection([threadSection(M10, 0, N.points)], 'Positive'));
    const turned = scope.keep(section.rotate(90));
    const wrong = scope.keep(section.rotate(-90));
    const area = slice.area();
    expect(scope.keep(slice.subtract(turned)).area()).toBeLessThan(area * 0.01);
    expect(scope.keep(slice.subtract(wrong)).area()).toBeGreaterThan(area * 0.02);
    scope.dispose();
  });

  it('is one closed solid between the minor and the major cylinder', () => {
    const scope = new CsgScope();
    const rod = threadRod(csg, scope, M10, 0, 2, 12, N);
    expect(rod.status()).toBe('NoError');
    expect(rod.decompose()).toHaveLength(1);
    const { min, max } = rod.boundingBox();
    expect(min[2]).toBeCloseTo(2);
    expect(max[2]).toBeCloseTo(12);
    const volume = rod.volume();
    expect(volume).toBeGreaterThan(Math.PI * minorRadius(M10) ** 2 * 10);
    expect(volume).toBeLessThan(Math.PI * (M10.d / 2) ** 2 * 10);
    scope.dispose();
  });

  it('rods started a whole number of pitches apart are in phase', () => {
    const scope = new CsgScope();
    const a = scope.keep(threadRod(csg, scope, M10, 0, 0, 4, N).slice(3));
    const b = scope.keep(threadRod(csg, scope, M10, 0, 2, 6, N).slice(3));
    expect(scope.keep(a.subtract(b)).area()).toBeLessThan(a.area() * 0.01);
    scope.dispose();
  });
});

/** The least and the most a screw overlaps a block, turned about its axis in 48 steps (a 7.5° step: finer than a flank's turn). */
function bestAndWorst(block: Manifold, screw: Manifold): [number, number] {
  let best = Infinity;
  let worst = 0;
  for (let step = 0; step < 48; step++) {
    const turned = screw.rotate([0, 0, (360 * step) / 48]);
    const meet = block.intersect(turned);
    best = Math.min(best, meet.volume());
    worst = Math.max(worst, meet.volume());
    meet.delete();
    // a turn by 0° may hand back the screw itself
    if (turned !== screw) turned.delete();
  }
  return [best, worst];
}

describe('threadHole', () => {
  // the print-friendly candidate of Case Constructor's test prints: the overhanging flank at 45°, the other at 30°
  const form: ThreadForm = { d: 6, pitch: 1.5, depth: 0.4, rise: 0.4, fall: 0.4 * Math.tan(Math.PI / 6) };

  // a tight fit (0.05 mm): with a usual one the wrong hole hides behind the clearance
  it('takes a screw of an asymmetric form as it goes in, tip down — an unturned rod does not', () => {
    const scope = new CsgScope();
    // the screw's thread, tip up in its own frame, turned over into the hole: its top at z = 0.5
    const coarse = { points: 24, slicesPerTurn: 24 };
    const screw = scope.keep(threadRod(csg, scope, form, 0, 0.5, 3.5, coarse).rotate([180, 0, 0]));
    const block = scope.keep(scope.keep(csg.Manifold.cube([10, 10, 4], true)).translate([0, 0, -2]));
    const good = scope.keep(block.subtract(threadHole(csg, scope, form, 0.05, 5, 1, coarse)));
    const wrong = scope.keep(block.subtract(threadRod(csg, scope, form, 0.05, -5, 1, coarse)));
    const [best, worst] = bestAndWorst(good, screw);
    expect(best).toBeLessThan(1e-3);
    expect(worst).toBeGreaterThan(1);
    expect(bestAndWorst(wrong, screw)[0]).toBeGreaterThan(0.1);
    scope.dispose();
  });
});
