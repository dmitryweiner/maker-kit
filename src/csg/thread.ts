// A printed thread (Case Constructor's; Cast Builder's is its symmetric
// form): its section, pure, and the rod and the hole made of it.
//
// A single-start helical thread has the same horizontal section at every
// height, turned by 360° per pitch: the thread is that section extruded with
// a twist — no helix mesh by hand, closed by construction. Sizes, screws,
// heads and the fit's limits are the apps' (domain geometry).
//
// Its WASM types are imported as types only: the section runs anywhere.

import type { Manifold } from 'manifold-3d';
import type { CsgApi, CsgScope } from './manifold';

/**
 * A thread's form: major diameter and pitch, mm; its radial depth and the
 * axial widths of its two flanks as shares of the pitch. `rise` is the flank
 * whose radius grows towards the tip — the one that overhangs on a screw
 * printed on its head; `fall` is the other. The crest and the root share the
 * rest equally.
 */
export interface ThreadForm {
  d: number;
  pitch: number;
  depth: number;
  rise: number;
  fall: number;
}

/** Points round the section and slices per turn: the app's, by the job (a preview takes fewer). */
export interface ThreadDetail {
  points: number;
  slicesPerTurn: number;
}

/** A 60° profile half a pitch deep, both flanks at 30° from the radial, flat crests and roots. */
export function symmetricForm(d: number, pitch: number): ThreadForm {
  const depth = 0.5;
  const flank = depth * Math.tan(Math.PI / 6);
  return { d, pitch, depth, rise: flank, fall: flank };
}

/** The minor radius: the major one less the thread's depth. */
export function minorRadius(form: ThreadForm): number {
  return form.d / 2 - form.depth * form.pitch;
}

/**
 * Radius at an axial phase t ∈ [0, 1) of the pitch, the phase growing
 * towards the tip: the crest's flat, the falling flank, the root's flat, the
 * rising flank.
 */
function profile(t: number, major: number, minor: number, form: ThreadForm): number {
  const flat = (1 - form.rise - form.fall) / 2;
  if (t < flat) return major;
  if (t < flat + form.fall) return major - ((t - flat) / form.fall) * (major - minor);
  if (t < 2 * flat + form.fall) return minor;
  return minor + ((t - 2 * flat - form.fall) / form.rise) * (major - minor);
}

/**
 * The thread's horizontal section at z = 0, counter-clockwise, `points`
 * points: at angle θ the radius is the profile at phase −θ / 2π, so the
 * section turned by 360° · z / pitch is the section at height z — a
 * right-hand thread. `grow` widens it radially (a hole: its fit).
 */
export function threadSection(form: ThreadForm, grow: number, points: number): [number, number][] {
  const major = form.d / 2 + grow;
  const minor = minorRadius(form) + grow;
  return Array.from({ length: points }, (_, i): [number, number] => {
    const theta = (2 * Math.PI * i) / points;
    const t = (((-i / points) % 1) + 1) % 1;
    const r = profile(t, major, minor, form);
    return [r * Math.cos(theta), r * Math.sin(theta)];
  });
}

/**
 * A threaded rod (or, grown by the fit, the core of a threaded hole) from z0
 * to z1 along z, tip up. Its section at z0 is `threadSection`'s: rods
 * started a whole number of pitches apart are in phase.
 */
export function threadRod(
  csg: CsgApi,
  scope: CsgScope,
  form: ThreadForm,
  grow: number,
  z0: number,
  z1: number,
  detail: ThreadDetail,
): Manifold {
  const turns = (z1 - z0) / form.pitch;
  const section = scope.keep(new csg.CrossSection([threadSection(form, grow, detail.points)], 'Positive'));
  const rod = scope.keep(section.extrude(z1 - z0, Math.max(1, Math.round(turns * detail.slicesPerTurn)), 360 * turns));
  return scope.keep(rod.translate([0, 0, z0]));
}

/**
 * The core of a threaded hole for a screw as it goes in, tip down: the
 * mouth at z = 0, `depth` down, `mouth` above it (to cut clean through a
 * face). Built as the screw's rod and turned over about x, so an asymmetric
 * form meets its own flanks the right way round. Grown by the fit.
 */
export function threadHole(
  csg: CsgApi,
  scope: CsgScope,
  form: ThreadForm,
  fit: number,
  depth: number,
  mouth: number,
  detail: ThreadDetail,
): Manifold {
  const rod = threadRod(csg, scope, form, fit, -mouth, depth, detail);
  return scope.keep(rod.rotate([180, 0, 0]));
}
