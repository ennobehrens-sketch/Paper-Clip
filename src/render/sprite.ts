// Procedural "pre-rendered" sprites.
//
// Each sprite is modelled as a small height field: shapes (signed distance functions) are
// stamped in with a height, a profile, a material and a colour. bake() then lights it like a
// little 3D render: normals from the height field, a key light from the top left, ambient
// occlusion, self-shadowing, specular highlights per material, paint wear at edges, a dark
// outline, and a separate soft drop shadow for the floor.

import { fbm, hash2 } from './noise';

export type RGB = [number, number, number];

export const hex = (s: string): RGB => {
  const n = parseInt(s.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};
export const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const scale = (a: RGB, k: number): RGB => [a[0] * k, a[1] * k, a[2] * k];

export const enum M {
  paint = 0,
  steel = 1,
  chrome = 2,
  rubber = 3,
  copper = 4,
  glass = 5,
  wood = 6,
  concrete = 7,
  plastic = 8,
  paper = 9,
  asphalt = 10,
  cast = 11,
}

interface MatDef { spec: number; shin: number; metal: number }
const MATS: MatDef[] = [
  { spec: 0.18, shin: 18, metal: 0 }, // paint
  { spec: 0.55, shin: 24, metal: 1 }, // steel
  { spec: 1.1, shin: 60, metal: 1 }, // chrome
  { spec: 0.06, shin: 8, metal: 0 }, // rubber
  { spec: 0.85, shin: 30, metal: 1 }, // copper
  { spec: 1.0, shin: 80, metal: 0 }, // glass
  { spec: 0.08, shin: 10, metal: 0 }, // wood
  { spec: 0.05, shin: 6, metal: 0 }, // concrete
  { spec: 0.35, shin: 30, metal: 0 }, // plastic
  { spec: 0.03, shin: 4, metal: 0 }, // paper
  { spec: 0.04, shin: 6, metal: 0 }, // asphalt
  { spec: 0.3, shin: 14, metal: 1 }, // cast iron
];

export type SDF = (x: number, y: number) => number;

// ---- shapes -------------------------------------------------------------------

export const box = (cx: number, cy: number, hw: number, hh: number, r = 0): SDF => (x, y) => {
  const qx = Math.abs(x - cx) - hw + r;
  const qy = Math.abs(y - cy) - hh + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
};
export const rect = (x0: number, y0: number, w: number, h: number, r = 0): SDF => box(x0 + w / 2, y0 + h / 2, w / 2, h / 2, r);
export const circle = (cx: number, cy: number, rad: number): SDF => (x, y) => Math.hypot(x - cx, y - cy) - rad;
export const ellipse = (cx: number, cy: number, rx: number, ry: number): SDF => (x, y) => {
  const k = Math.hypot((x - cx) / rx, (y - cy) / ry);
  return (k - 1) * Math.min(rx, ry);
};
export const ring = (cx: number, cy: number, rad: number, w: number): SDF => (x, y) => Math.abs(Math.hypot(x - cx, y - cy) - rad) - w / 2;
export const capsule = (x1: number, y1: number, x2: number, y2: number, r: number): SDF => (x, y) => {
  const px = x - x1, py = y - y1, bx = x2 - x1, by = y2 - y1;
  const t = Math.max(0, Math.min(1, (px * bx + py * by) / (bx * bx + by * by || 1)));
  return Math.hypot(px - bx * t, py - by * t) - r;
};
export const union = (...s: SDF[]): SDF => (x, y) => Math.min(...s.map((f) => f(x, y)));
export const subtract = (a: SDF, b: SDF): SDF => (x, y) => Math.max(a(x, y), -b(x, y));
export const intersect = (a: SDF, b: SDF): SDF => (x, y) => Math.max(a(x, y), b(x, y));
export const rotate = (s: SDF, cx: number, cy: number, ang: number): SDF => {
  const c = Math.cos(-ang), sn = Math.sin(-ang);
  return (x, y) => s(cx + (x - cx) * c - (y - cy) * sn, cy + (x - cx) * sn + (y - cy) * c);
};
export const poly = (pts: [number, number][]): SDF => (x, y) => {
  let d = Infinity;
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    const ex = xj - xi, ey = yj - yi, wx = x - xi, wy = y - yi;
    const t = Math.max(0, Math.min(1, (wx * ex + wy * ey) / (ex * ex + ey * ey)));
    d = Math.min(d, Math.hypot(wx - ex * t, wy - ey * t));
    if (yi > y !== yj > y && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside ? -d : d;
};

// ---- builder ------------------------------------------------------------------

export interface DrawOpts {
  /** Base height of the shape. */
  z?: number;
  /** Thickness above z. */
  h?: number;
  /** Edge rounding width for the flat profile. */
  bevel?: number;
  /** 'round' makes tubes and domes: height falls off over `radius` from the edge. */
  profile?: 'flat' | 'round';
  radius?: number;
  /** Custom height above z, given position and distance inside the shape. */
  height?: (x: number, y: number, d: number) => number;
  color: RGB | ((x: number, y: number, d: number) => RGB);
  mat?: M;
  /** Paint chipping at edges, 0..1. */
  wear?: number;
  /** Unlit glow colour (lights, LEDs). */
  emissive?: RGB | ((x: number, y: number) => RGB | null);
  /** max: keep the higher surface. over: always paint on top. carve: cut grooves. paint: recolour only. */
  mode?: 'max' | 'over' | 'carve' | 'paint';
  /** Fine albedo noise, 0..1. */
  grain?: number;
  seed?: number;
}

export interface Sprite {
  img: HTMLCanvasElement;
  shadow: HTMLCanvasElement;
  /** Size in world units (the canvases are `res` times larger). */
  w: number;
  h: number;
  /** Anchor: the sprite is drawn at (x - ax, y - ay). */
  ax: number;
  ay: number;
  res: number;
}

/** Sprite pixels per world pixel. 2 gives half-pixel detail when zoomed in. */
export const RES = 2;

const BARE_STEEL: RGB = [0.56, 0.58, 0.6];
const BLOCK = 8;

export class SpriteBuilder {
  readonly W: number;
  readonly H: number;
  readonly hgt: Float32Array;
  readonly alb: Float32Array;
  readonly mat: Uint8Array;
  readonly a: Float32Array;
  readonly emi: Float32Array;
  readonly hasEmi: Uint8Array;

  constructor(readonly w: number, readonly h: number, readonly res = RES) {
    this.W = Math.ceil(w * res);
    this.H = Math.ceil(h * res);
    const n = this.W * this.H;
    this.hgt = new Float32Array(n);
    this.alb = new Float32Array(n * 3);
    this.mat = new Uint8Array(n);
    this.a = new Float32Array(n);
    this.emi = new Float32Array(n * 3);
    this.hasEmi = new Uint8Array(n);
  }

  draw(shape: SDF, o: DrawOpts): this {
    const z = o.z ?? 0, th = o.h ?? 1, bevel = o.bevel ?? 1, mode = o.mode ?? 'max';
    const mat = o.mat ?? M.paint, wear = o.wear ?? 0, grain = o.grain ?? 0.06, seed = o.seed ?? 1;
    const radius = o.radius ?? 4;
    const md = MATS[mat];
    const { W, H, res } = this;
    const blockR = (BLOCK * 0.7072) / res + 1 / res;
    for (let by = 0; by < H; by += BLOCK) {
      for (let bx = 0; bx < W; bx += BLOCK) {
        // Distance bound: skip blocks the shape cannot touch.
        if (shape((bx + BLOCK / 2) / res, (by + BLOCK / 2) / res) > blockR) continue;
        const yEnd = Math.min(by + BLOCK, H), xEnd = Math.min(bx + BLOCK, W);
        for (let y = by; y < yEnd; y++) {
          for (let x = bx; x < xEnd; x++) {
            const px = (x + 0.5) / res, py = (y + 0.5) / res;
            const sd = shape(px, py);
            const cov = Math.max(0, Math.min(1, 0.5 - sd * res));
            if (cov <= 0) continue;
            const i = y * W + x;
            const d = -sd;
            let hh: number;
            if (o.height) hh = o.height(px, py, d);
            else if (o.profile === 'round') {
              const t = Math.max(0, radius - Math.max(0, d)) / radius;
              hh = th * Math.sqrt(Math.max(0, 1 - t * t));
            } else hh = th * Math.min(1, Math.max(0.35, (d + 0.5 / res) / bevel));
            const top = z + hh;
            if (mode === 'carve') {
              this.hgt[i] = Math.max(0, this.hgt[i] - th * cov);
              const k = 1 - 0.25 * cov;
              this.alb[i * 3] *= k; this.alb[i * 3 + 1] *= k; this.alb[i * 3 + 2] *= k;
              continue;
            }
            if (mode === 'paint' && this.a[i] <= 0) continue;
            if (mode === 'max' && this.a[i] > 0 && top < this.hgt[i]) continue;
            let c = typeof o.color === 'function' ? o.color(px, py, d) : o.color;
            const g = (hash2(x, y, seed) - 0.5) * grain + (fbm(px, py, 6, seed + 3, 2) - 0.5) * grain;
            c = [c[0] * (1 + g), c[1] * (1 + g), c[2] * (1 + g)];
            let m = mat;
            if (wear > 0 && mat === M.paint) {
              const n = fbm(px, py, 3, seed + 11, 3);
              const edge = d < 1.6 + wear * 1.5;
              if ((edge && n > 0.62 - wear * 0.25) || n > 0.93 - wear * 0.12) {
                c = mix(BARE_STEEL, [0.4, 0.38, 0.36], fbm(px, py, 4, seed + 5, 2) * 0.6);
                m = M.steel;
              } else if (edge && n > 0.55 - wear * 0.25) {
                c = scale(c, 0.82); // grime along chipped edges
              }
            }
            if (md.metal && mat === M.steel) {
              const s2 = (fbm(px * 0.15, py * 3, 3, seed + 7, 2) - 0.5) * 0.12;
              c = [c[0] * (1 + s2), c[1] * (1 + s2), c[2] * (1 + s2)];
            }
            const prevA = this.a[i];
            const blend = prevA > 0 ? cov : 1;
            this.alb[i * 3] = this.alb[i * 3] * (1 - blend) + c[0] * blend;
            this.alb[i * 3 + 1] = this.alb[i * 3 + 1] * (1 - blend) + c[1] * blend;
            this.alb[i * 3 + 2] = this.alb[i * 3 + 2] * (1 - blend) + c[2] * blend;
            if (cov > 0.5 || prevA <= 0) this.mat[i] = m;
            if (mode !== 'paint') {
              this.hgt[i] = prevA > 0 && cov < 1 ? Math.max(this.hgt[i], top * cov + this.hgt[i] * (1 - cov)) : top;
              this.a[i] = Math.max(prevA, cov);
            }
            if (o.emissive) {
              const e = typeof o.emissive === 'function' ? o.emissive(px, py) : o.emissive;
              if (e) {
                this.emi[i * 3] = e[0]; this.emi[i * 3 + 1] = e[1]; this.emi[i * 3 + 2] = e[2];
                this.hasEmi[i] = 1;
              } else this.hasEmi[i] = 0;
            } else if (cov > 0.5) this.hasEmi[i] = 0;
          }
        }
      }
    }
    return this;
  }

  /** Scatter small bolts/rivets along a rectangle's edge. */
  bolts(x0: number, y0: number, w: number, h: number, step: number, z: number, color: RGB = [0.62, 0.64, 0.66]): this {
    const pts: [number, number][] = [];
    for (let x = x0; x <= x0 + w + 0.01; x += step) { pts.push([x, y0]); pts.push([x, y0 + h]); }
    for (let y = y0 + step; y < y0 + h - 0.01; y += step) { pts.push([x0, y]); pts.push([x0 + w, y]); }
    for (const [x, y] of pts) this.draw(circle(x, y, 0.9), { z, h: 0.9, profile: 'round', radius: 0.9, color, mat: M.steel });
    return this;
  }

  bake(opts: { outline?: number; shadow?: number; ax?: number; ay?: number } = {}): Sprite {
    const { W, H: Hh, hgt, alb, a, res } = this;
    const outline = opts.outline ?? 0.8;
    const H = (x: number, y: number) => (x < 0 || y < 0 || x >= W || y >= Hh ? 0 : a[y * W + x] > 0.05 ? hgt[y * W + x] : 0);
    const L = norm3(-0.5, -0.68, 0.78);
    const Hv = norm3(L[0], L[1], L[2] + 1);
    const lxy = Math.hypot(L[0], L[1]);
    const slope = L[2] / lxy;
    const ldx = -L[0] / lxy, ldy = -L[1] / lxy; // towards the light, in the image plane
    const AMB: RGB = [0.4, 0.43, 0.5];
    const SUN: RGB = [1.1, 1.0, 0.86];

    const img = makeCanvas(W, Hh);
    const ctx = img.getContext('2d')!;
    const out = ctx.createImageData(W, Hh);
    const od = out.data;
    for (let y = 0; y < Hh; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (a[i] <= 0) {
          if (outline > 0) {
            let near = 0;
            for (const [dx, dy] of N4) {
              const xx = x + dx, yy = y + dy;
              if (xx >= 0 && yy >= 0 && xx < W && yy < Hh) near = Math.max(near, a[yy * W + xx]);
            }
            if (near > 0.5) { od[i * 4] = 8; od[i * 4 + 1] = 9; od[i * 4 + 2] = 11; od[i * 4 + 3] = Math.round(255 * outline); }
          }
          continue;
        }
        if (this.hasEmi[i]) {
          od[i * 4] = to8(this.emi[i * 3]); od[i * 4 + 1] = to8(this.emi[i * 3 + 1]); od[i * 4 + 2] = to8(this.emi[i * 3 + 2]);
          od[i * 4 + 3] = Math.round(255 * Math.min(1, a[i] * 1.5));
          continue;
        }
        const hc = H(x, y);
        const gx = clamp(((H(x + 1, y) - H(x - 1, y)) / 2) * res, -2.5, 2.5);
        const gy = clamp(((H(x, y + 1) - H(x, y - 1)) / 2) * res, -2.5, 2.5);
        const N = norm3(-gx * 0.9, -gy * 0.9, 1);
        const diff = Math.max(0, N[0] * L[0] + N[1] * L[1] + N[2] * L[2]);
        let occ = 0;
        for (const r of [2, 5]) {
          for (const [dx, dy] of N8) {
            const dh = H(Math.round(x + dx * r * res), Math.round(y + dy * r * res)) - hc;
            if (dh > 0) occ += Math.min(1, dh / (r * 1.6));
          }
        }
        const ao = clamp(1 - occ / 10, 0.36, 1);
        let sh = 1;
        for (let t = 1.5 * res; t < 48 * res; t += 2) {
          const sx = Math.round(x + ldx * t), sy = Math.round(y + ldy * t);
          if (sx < 0 || sy < 0 || sx >= W || sy >= Hh) break;
          if (H(sx, sy) > hc + (t / res) * slope * 0.9 + 0.4) { sh = 0.4; break; }
        }
        const md = MATS[this.mat[i]];
        const nh = Math.max(0, N[0] * Hv[0] + N[1] * Hv[1] + N[2] * Hv[2]);
        const spec = Math.pow(nh, md.shin) * md.spec;
        const c: RGB = [alb[i * 3], alb[i * 3 + 1], alb[i * 3 + 2]];
        const sc: RGB = md.metal ? [0.35 + c[0] * 0.9, 0.35 + c[1] * 0.9, 0.35 + c[2] * 0.9] : [1, 0.97, 0.9];
        // top-left rim light on raised edges, a classic pre-rendered sprite cue
        const rim = Math.max(0, -(gx + gy) * 0.08) * (md.metal ? 1.4 : 0.8);
        const grime = hc < 2 ? 0.86 + hc * 0.07 : 1;
        for (let k = 0; k < 3; k++) {
          const v = c[k] * (AMB[k] * ao + diff * SUN[k] * sh) * grime + spec * sc[k] * sh * (0.4 + 0.6 * ao) + rim * sh;
          od[i * 4 + k] = to8(v);
        }
        od[i * 4 + 3] = Math.round(255 * Math.min(1, a[i]));
      }
    }
    ctx.putImageData(out, 0, 0);

    // drop shadow, cast down-right
    let maxH = 0;
    for (let i = 0; i < hgt.length; i++) if (a[i] > 0 && hgt[i] > maxH) maxH = hgt[i];
    const k = opts.shadow ?? 0.62;
    const margin = Math.ceil((maxH * k + 4) * res);
    const sw = W + margin, shh = Hh + margin;
    const mask = new Float32Array(sw * shh);
    for (let y = 0; y < Hh; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (a[i] < 0.3) continue;
        const len = hgt[i] * k * res;
        for (let t = 0; t <= len; t += 0.8) {
          const sx = Math.round(x + t * 0.62), sy = Math.round(y + t * 0.78);
          if (sx < sw && sy < shh) mask[sy * sw + sx] = 1;
        }
      }
    }
    const blurred = boxBlur(boxBlur(mask, sw, shh, res), sw, shh, res);
    const shadow = makeCanvas(sw, shh);
    const sctx = shadow.getContext('2d')!;
    const sd = sctx.createImageData(sw, shh);
    for (let i = 0; i < sw * shh; i++) {
      sd.data[i * 4] = 6; sd.data[i * 4 + 1] = 7; sd.data[i * 4 + 2] = 10;
      sd.data[i * 4 + 3] = Math.round(255 * blurred[i] * 0.55);
    }
    sctx.putImageData(sd, 0, 0);
    return { img, shadow, w: this.w, h: this.h, ax: opts.ax ?? this.w / 2, ay: opts.ay ?? this.h / 2, res };
  }
}

const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const N8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]];
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const to8 = (v: number) => Math.max(0, Math.min(255, Math.round(Math.pow(Math.max(0, v), 0.95) * 255)));
function norm3(x: number, y: number, z: number): [number, number, number] {
  const l = Math.hypot(x, y, z) || 1;
  return [x / l, y / l, z / l];
}

function boxBlur(src: Float32Array, w: number, h: number, r: number): Float32Array {
  const tmp = new Float32Array(w * h), out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let s = 0, n = 0;
    for (let k = -r; k <= r; k++) { const xx = x + k; if (xx >= 0 && xx < w) { s += src[y * w + xx]; n++; } }
    tmp[y * w + x] = s / n;
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let s = 0, n = 0;
    for (let k = -r; k <= r; k++) { const yy = y + k; if (yy >= 0 && yy < h) { s += tmp[yy * w + x]; n++; } }
    out[y * w + x] = s / n;
  }
  return out;
}

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

/** Rotates a baked sprite by a multiple of 90 degrees (shadow is re-cast by drawing order, so it is kept). */
export function rotateCanvas(src: HTMLCanvasElement, quarterTurns: number): HTMLCanvasElement {
  const q = ((quarterTurns % 4) + 4) % 4;
  const c = makeCanvas(q % 2 ? src.height : src.width, q % 2 ? src.width : src.height);
  const g = c.getContext('2d')!;
  g.translate(c.width / 2, c.height / 2);
  g.rotate((q * Math.PI) / 2);
  g.drawImage(src, -src.width / 2, -src.height / 2);
  return c;
}
