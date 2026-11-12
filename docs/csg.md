# csg — booleans on manifold-3d, in a worker

`maker-kit/csg/*` is the bridge to [manifold-3d](https://github.com/elalish/manifold)
(WASM) that every app's `csg.ts` repeated, and the printed thread two of
them build. It runs in an app's job worker: the page never loads the WASM
(each app's CI greps its main chunk for `manifold`).

`manifold-3d` is an optional peer dependency: an app that builds solids
installs it (`>= 3.5`). Its `vite.config.ts`, beside the kit's lines
(README, "Install"):

```ts
worker: { format: 'es' },
// manifold finds its .wasm by a path relative to its glue, which pre-bundling breaks
optimizeDeps: { exclude: ['maker-kit', 'manifold-3d'] },
```

## csg/manifold

```ts
import { CsgScope, fromManifold, initCSG, outerOutline, toManifold } from 'maker-kit/csg/manifold';

const csg = await initCSG();               // the WASM, once per worker; the same promise later
const scope = new CsgScope();
try {
  const part = scope.keep(toManifold(csg, mesh, { merge: true }));   // merge: an imported STL
  const hole = scope.keep(csg.Manifold.cylinder(10, 3, 3, 48));
  return fromManifold(scope.keep(part.subtract(hole)));             // a SurfaceMesh with normals
} finally {
  scope.dispose();
}
```

- **`CsgScope`**: Manifold and CrossSection objects are not collected by
  the GC. Everything made goes into a scope (`keep` returns its argument),
  and the scope is disposed in `finally`; without it the WASM heap runs out
  after a few exports. Keep each object once: a second `keep` deletes it
  twice.
- **`toManifold(csg, mesh, { merge? })`** throws
  `toManifold: mesh is not a closed solid (<reason>)` rather than hand back
  an object whose bad status spoils every later operation. `merge` welds
  vertices near each other on open edges: an STL may write one vertex as
  two floats; a mesh stitched by the app's own indices does not need it.
- **`fromManifold(solid)`** picks x, y, z out of vertices with more
  properties and computes the normals anew.
- **`outerOutline(csg, scope, section)`**: the section with its holes
  filled (the counter-clockwise rings); an empty section gives an empty
  one. A hole through a tile is a post of its mold; a plate's outline keeps
  no holes of its picture.

## csg/thread

A single-start right-hand thread is its horizontal section extruded with a
twist of 360° per pitch: closed by construction, no helix by hand. The form
is Case Constructor's (its test prints chose it):

```ts
interface ThreadForm { d: number; pitch: number; depth: number; rise: number; fall: number }
```

`d` and `pitch` in mm; `depth` (radial) and the axial widths of the two
flanks as shares of the pitch. `rise` is the flank whose radius grows
towards the tip — the one that overhangs on a screw printed standing on
its head; `fall` the other. The crest and the root share the rest.
`symmetricForm(d, pitch)` is the 60° profile half a pitch deep.

```ts
import { symmetricForm, threadHole, threadRod, threadSection } from 'maker-kit/csg/thread';

const M10 = symmetricForm(10, 2);
const detail = { points: 48, slicesPerTurn: 16 };              // fewer for a preview
const screw = threadRod(csg, scope, M10, 0, 0, 30, detail);    // tip up, z 0 → 30
const hole = threadHole(csg, scope, M10, 0.35, 12, 1, detail); // mouth at z = 0, 12 down, 1 above; grown by the fit
const nut = scope.keep(block.subtract(hole));
```

- `threadSection(form, grow, points)` is pure (no WASM): the section at
  z = 0, counter-clockwise; `grow` widens it radially.
- Rods started a whole number of pitches apart are in phase.
- `threadHole` is the screw's rod turned over about x: a screw goes in tip
  down, and an asymmetric form meets its own flanks only that way round.
- Slices: a slice per point makes needle-thin triangles that slow every
  boolean on them (Cast Builder: 16 slices per turn against 48 points).
- Sizes, screws, heads, stops and the fit's limits are the app's.
