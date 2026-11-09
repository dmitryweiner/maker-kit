// The 3D view's stand-in where there is no WebGL: the bed's grid and a box on
// it, drawn in SVG in the projection the camera chips pick. Z is up, as in
// printing; the box follows the panel's width and height.

export type View = 'iso' | 'top' | 'front';
export const VIEWS: readonly View[] = ['iso', 'top', 'front'];
export const isView = (value: unknown): value is View => VIEWS.some((view) => view === value);

type Point = readonly [number, number, number];

const SVG = 'http://www.w3.org/2000/svg';
const BED = 100;
const CELL = 10;
const DEPTH = 40;
const COS30 = Math.cos(Math.PI / 6);

/** Screen x, y (down) of a point, mm. Iso looks from the front right, above. */
function project(view: View, [x, y, z]: Point): [number, number] {
  if (view === 'top') return [x, -y];
  if (view === 'front') return [x, -z];
  return [(x - y) * COS30, (x + y) * 0.5 - z];
}

function node(tag: string, attrs: Record<string, string>): SVGElement {
  const el = document.createElementNS(SVG, tag);
  for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, value);
  return el;
}

/** Draws the bed and the box into `host`, replacing what was there. */
export function drawScene(host: HTMLElement, view: View, box: { width: number; height: number }): void {
  const points: [number, number][] = [];
  const at = (p: Point): [number, number] => {
    const q = project(view, p);
    points.push(q);
    return q;
  };
  const path = (corners: readonly Point[]): string =>
    `M${corners
      .map((p) =>
        at(p)
          .map((v) => v.toFixed(2))
          .join(' '),
      )
      .join('L')}Z`;

  const svg = node('svg', { class: 'scene', role: 'img', 'aria-label': `${view}: ${box.width} × ${DEPTH} × ${box.height} mm` });
  const grid = node('g', { class: 'scene-grid' });
  if (view === 'front') {
    // the bed seen edge on
    const [a, b] = [at([-BED, 0, 0]), at([BED, 0, 0])];
    grid.append(node('line', { x1: String(a[0]), y1: String(a[1]), x2: String(b[0]), y2: String(b[1]) }));
  } else {
    for (let v = -BED; v <= BED; v += CELL) {
      const lines: [Point, Point][] = [
        [
          [v, -BED, 0],
          [v, BED, 0],
        ],
        [
          [-BED, v, 0],
          [BED, v, 0],
        ],
      ];
      for (const [from, to] of lines) {
        const [a, b] = [at(from), at(to)];
        const cls = v === 0 ? 'scene-axis' : '';
        grid.append(node('line', { x1: String(a[0]), y1: String(a[1]), x2: String(b[0]), y2: String(b[1]), class: cls }));
      }
    }
  }
  svg.append(grid);

  const [w, d, h] = [box.width / 2, DEPTH / 2, box.height];
  const faces: { cls: string; corners: Point[] }[] =
    view === 'top'
      ? [
          {
            cls: 'face-top',
            corners: [
              [-w, -d, h],
              [w, -d, h],
              [w, d, h],
              [-w, d, h],
            ],
          },
        ]
      : view === 'front'
        ? [
            {
              cls: 'face-front',
              corners: [
                [-w, -d, 0],
                [w, -d, 0],
                [w, -d, h],
                [-w, -d, h],
              ],
            },
          ]
        : [
            // the faces turned to the viewer, the top last
            {
              cls: 'face-side',
              corners: [
                [w, -d, 0],
                [w, d, 0],
                [w, d, h],
                [w, -d, h],
              ],
            },
            {
              cls: 'face-front',
              corners: [
                [-w, d, 0],
                [w, d, 0],
                [w, d, h],
                [-w, d, h],
              ],
            },
            {
              cls: 'face-top',
              corners: [
                [-w, -d, h],
                [w, -d, h],
                [w, d, h],
                [-w, d, h],
              ],
            },
          ];
  for (const face of faces) svg.append(node('path', { d: path(face.corners), class: face.cls }));

  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const pad = 12;
  const [minX, minY] = [Math.min(...xs) - pad, Math.min(...ys) - pad];
  svg.setAttribute('viewBox', [minX, minY, Math.max(...xs) + pad - minX, Math.max(...ys) + pad - minY].map((v) => v.toFixed(1)).join(' '));
  host.replaceChildren(svg);
}
