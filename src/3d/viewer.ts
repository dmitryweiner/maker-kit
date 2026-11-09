// The base of every app's 3D view (Plate Builder's scene with Cast Builder's
// parts and inset): the renderer, orbit controls, a light set low enough
// that a 0.2 mm relief shades readably, creased normals, a grid under the
// model, camera presets, and the room a phone's sheet takes. It takes
// finished buffers and knows nothing of the geometry. What an app adds —
// captions, ghosts, spots, axes — it adds to `model` itself.
//
// The model is z-up (the printing convention); `model` turns it y-up for
// display, centred over the bed and standing on it. Frames are drawn on
// demand: a camera move, a resize, new meshes — never a loop at rest.
// Colours follow the page's tokens (--bg, --line, --muted). Kept thin:
// vitest does not load it; the showcase's smoke does.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import type { IndexedMesh } from './mesh';

export type CameraPreset = 'iso' | 'top' | 'front' | 'side' | 'bottom';

export interface ViewerPart {
  mesh: IndexedMesh;
  /** the default is a warm white plastic */
  material?: THREE.Material;
}

export interface Viewer {
  /** z-up content, turned y-up for display, centred over the bed: an app adds its own objects here */
  model: THREE.Group;
  /** the parts to show, all at once; none clears the view */
  setMeshes(parts: readonly ViewerPart[]): void;
  /** the printer's bed: the grid is at least this big */
  fitBed(widthMm: number, depthMm: number): void;
  camera(preset: CameraPreset): void;
  /** how much of the view's bottom a sheet covers, px: the model is centred above it */
  setInset(px: number): void;
  /** reads the page's colour tokens again — after a theme or an accent change */
  recolor(): void;
  /** draws a frame (on the next animation frame) */
  render(): void;
  dispose(): void;
}

const MODEL_COLOR = 0xe9e4da;
/** room around the model's bounding sphere when the camera fits it */
const FIT_MARGIN = 1.7;
/** faces meeting at more than this angle get their own normals: a slab's edges stay sharp */
const CREASE = (40 * Math.PI) / 180;
/** Directions to the camera from the target, in the display frame (y up; the model's front faces +z). */
const PRESETS: Record<CameraPreset, readonly [number, number, number]> = {
  iso: [0.7, 0.62, 0.95],
  top: [0, 1, 0.0001],
  bottom: [0, -1, 0.0001],
  front: [0, 0.0001, 1],
  side: [1, 0.0001, 0],
};

/** A colour token of the page, or the fallback. */
function token(name: string, fallback: string): THREE.Color {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return new THREE.Color(value || fallback);
}

export function createViewer(canvas: HTMLCanvasElement, o: { background?: string } = {}): Viewer | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  } catch {
    // no WebGL: the app works on without its 3D view
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 1, 5000);
  scene.add(new THREE.HemisphereLight(0xf4f1ea, 0x2b3038, 0.75));
  // low and from one side: a shallow relief reads by its shadows' gradient
  const key = new THREE.DirectionalLight(0xfff6ea, 2.2);
  key.position.set(-1, 0.45, 0.6);
  const fill = new THREE.DirectionalLight(0xc6d2ff, 0.35);
  fill.position.set(1, 0.3, -0.8);
  // from below and aside, for a look at the bottom
  const under = new THREE.DirectionalLight(0xffffff, 1.5);
  under.position.set(-0.8, -0.6, 0.5);
  scene.add(key, fill, under);

  // z-up (model) → y-up (screen)
  const model = new THREE.Group();
  model.rotation.x = -Math.PI / 2;
  scene.add(model);
  const parts = new THREE.Group();
  model.add(parts);
  const material = new THREE.MeshStandardMaterial({ color: MODEL_COLOR, metalness: 0, roughness: 0.75, side: THREE.DoubleSide });

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;

  let grid: THREE.GridHelper | null = null;
  let gridKey = '';
  let bed = { width: 0, depth: 0 };
  let size = new THREE.Vector3();
  let radius = 60;
  let fitted = false;
  /** whether the person turned or zoomed since the last fit: until then a resize fits again */
  let touched = false;
  let inset = 0;
  let frameId = 0;
  let disposed = false;
  let colors = { background: new THREE.Color(), center: new THREE.Color(), lines: new THREE.Color() };

  function recolor(): void {
    const line = token('--line', '#343b44');
    colors = {
      background: o.background ? new THREE.Color(o.background) : token('--bg', '#15181c'),
      center: line.clone().lerp(token('--muted', '#94a0ad'), 0.35),
      lines: line,
    };
    renderer.setClearColor(colors.background);
    gridKey = '';
    setGrid();
    render();
  }

  function setGrid(): void {
    const span = Math.max(size.x, size.y, bed.width, bed.depth, 40) * 1.3;
    // whole centimetres, wider than the model; 5 cm cells on a big one
    const cell = span > 400 ? 50 : 10;
    const cells = Math.ceil(span / cell);
    const nextKey = `${cells}x${cell}`;
    if (grid && nextKey === gridKey) return;
    if (grid) {
      scene.remove(grid);
      grid.dispose();
    }
    grid = new THREE.GridHelper(cells * cell, cells, colors.center, colors.lines);
    // a hair under the model's bottom, or its face flickers through the lines
    grid.position.y = -0.05;
    scene.add(grid);
    gridKey = nextKey;
  }

  function resize(): void {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === 0 || h === 0) return;
    const dpr = Math.min(window.devicePixelRatio, 2);
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      // a view hidden while fitted had another shape: fit to the one it shows in
      if (fitted && !touched) place(camera.position.clone().sub(controls.target));
    }
    // the window into the picture slides down by half the inset: the model rises above the sheet
    const shift = Math.min(inset, h * 0.8) / 2;
    if (shift > 0) camera.setViewOffset(w, h, 0, shift, w, h);
    else if (camera.view?.enabled) camera.clearViewOffset();
  }

  function draw(): void {
    frameId = 0;
    if (disposed) return;
    resize();
    const moving = controls.update();
    // from under the bed the grid would hide the bottom: it shows from above only
    if (grid) grid.visible = camera.position.y > controls.target.y;
    renderer.render(scene, camera);
    // damping carries the camera on after the hand lets go
    if (moving) render();
  }

  function render(): void {
    if (!disposed && frameId === 0) frameId = requestAnimationFrame(draw);
  }

  /**
   * Puts the camera so that the model's bounding sphere fits the part of the
   * view a sheet leaves free, with a margin, looking from `direction`.
   */
  function place(direction: THREE.Vector3): void {
    const h = canvas.clientHeight;
    const free = h > 0 ? Math.max(0.2, 1 - Math.min(inset, h * 0.8) / h) : 1;
    const vFov = 2 * Math.atan(Math.tan((camera.fov * Math.PI) / 360) * free);
    const hFov = 2 * Math.atan(Math.tan((camera.fov * Math.PI) / 360) * (camera.aspect || 1));
    const distance = (radius / Math.sin(Math.min(vFov, hFov) / 2)) * FIT_MARGIN;
    touched = false;
    controls.target.set(0, size.z / 2, 0);
    camera.position.copy(controls.target).add(direction.clone().setLength(distance));
    camera.near = Math.max(0.1, distance / 200);
    camera.far = distance * 20;
    camera.updateProjectionMatrix();
    render();
  }

  function setMeshes(next: readonly ViewerPart[]): void {
    for (const child of parts.children) if (child instanceof THREE.Mesh) child.geometry.dispose();
    parts.clear();
    const bounds = new THREE.Box3();
    for (const part of next) {
      if (part.mesh.indices.length === 0) continue;
      const indexed = new THREE.BufferGeometry();
      indexed.setAttribute('position', new THREE.BufferAttribute(part.mesh.positions, 3));
      indexed.setIndex(new THREE.BufferAttribute(part.mesh.indices, 1));
      const geometry = toCreasedNormals(indexed, CREASE);
      indexed.dispose();
      geometry.computeBoundingBox();
      if (geometry.boundingBox) bounds.union(geometry.boundingBox);
      parts.add(new THREE.Mesh(geometry, part.material ?? material));
    }
    if (bounds.isEmpty()) {
      size = new THREE.Vector3();
      setGrid();
      render();
      return;
    }
    // over the middle of the bed, standing on it: model (x, y, z) shows at (x, z, −y)
    const center = bounds.getCenter(new THREE.Vector3());
    model.position.set(-center.x, -bounds.min.z, center.y);
    size = bounds.getSize(new THREE.Vector3());
    setGrid();
    const nextRadius = size.length() / 2;
    // fitted once, and again (from where it looks now) when the model changes its size a lot
    if (!fitted || Math.abs(nextRadius - radius) > radius * 0.2) {
      radius = nextRadius;
      place(fitted ? camera.position.clone().sub(controls.target) : new THREE.Vector3(...PRESETS.iso));
      fitted = true;
    }
    render();
  }

  controls.addEventListener('start', () => {
    touched = true;
  });
  controls.addEventListener('change', render);
  const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(render);
  observer?.observe(canvas);
  recolor();

  return {
    model,
    setMeshes,
    fitBed(width, depth) {
      bed = { width, depth };
      setGrid();
      render();
    },
    camera: (preset) => place(new THREE.Vector3(...PRESETS[preset])),
    setInset(px) {
      inset = Math.max(0, px);
      // the sheet came or went: fit what is left free, unless the person placed the camera
      if (fitted && !touched) place(camera.position.clone().sub(controls.target));
      render();
    },
    recolor,
    render,
    dispose() {
      disposed = true;
      if (frameId) cancelAnimationFrame(frameId);
      observer?.disconnect();
      controls.dispose();
      setMeshes([]);
      material.dispose();
      grid?.dispose();
      renderer.dispose();
    },
  };
}
