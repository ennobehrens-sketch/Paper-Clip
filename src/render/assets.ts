// The Foundry art set. Every sprite is modelled here and baked once at startup.
// Units are sprite pixels; the world uses the same units.

import { fbm, hash2, mulberry } from './noise';
import {
  M, SpriteBuilder, box, capsule, circle, ellipse, hex, makeCanvas, mix, poly, rect, ring, rotate, scale, subtract, union,
  type RGB, type SDF, type Sprite,
} from './sprite';

// ---- palette ------------------------------------------------------------------
export const P = {
  yellow: hex('#d9a21b'),
  yellowDark: hex('#a8770f'),
  black: hex('#1c1d1f'),
  steel: hex('#8d969e'),
  steelDark: hex('#4b535a'),
  steelDeep: hex('#30363b'),
  chrome: hex('#cfd6dc'),
  copper: hex('#c4692c'),
  copperLight: hex('#e59a5c'),
  wood: hex('#9a6a3c'),
  woodDark: hex('#6e4523'),
  ply: hex('#c39a62'),
  rubber: hex('#1f2123'),
  glass: hex('#2f5f80'),
  machineGrey: hex('#5b6874'),
  rackBlack: hex('#22262b'),
  castGreen: hex('#4e6a5b'),
  red: hex('#b3322b'),
  white: hex('#d9dcd8'),
  cardboard: hex('#a9804f'),
  concrete: hex('#7d7f7c'),
  blue: hex('#2d5d8c'),
};

const stripes = (a: RGB, b: RGB, period: number, ang = 1): ((x: number, y: number) => RGB) => (x, y) => (Math.floor((x + y * ang) / period) % 2 === 0 ? a : b);
const hazard = stripes(P.yellow, P.black, 3);

// ---- AutoClipper -----------------------------------------------------------------
export function autoClipper(): Sprite {
  const b = new SpriteBuilder(36, 38);
  // steel base plate with tread
  b.draw(box(18, 20, 16, 16, 1.5), { h: 2, mat: M.steel, color: (x, y) => (treadBump(x, y) ? P.steel : P.steelDark), height: (x, y) => 1.6 + (treadBump(x, y) ? 0.5 : 0), seed: 3 });
  b.draw(rect(2.5, 31, 31, 3.5), { z: 0, h: 2.3, color: hazard, wear: 0.5, mode: 'over', seed: 5 });
  b.bolts(4, 6, 28, 23, 28, 2);
  // wire feed rollers at the back
  b.draw(capsule(9, 7, 27, 7, 2.2), { z: 2, h: 4, profile: 'round', radius: 2.2, mat: M.chrome, color: P.chrome });
  b.draw(capsule(9, 11.5, 27, 11.5, 2.2), { z: 2, h: 4, profile: 'round', radius: 2.2, mat: M.chrome, color: P.chrome });
  b.draw(rect(6.5, 4, 2.5, 10), { z: 2, h: 7, color: P.machineGrey, wear: 0.4 });
  b.draw(rect(27, 4, 2.5, 10), { z: 2, h: 7, color: P.machineGrey, wear: 0.4 });
  b.draw(capsule(18, 0, 18, 13, 0.7), { z: 6.5, h: 1, profile: 'round', radius: 0.7, mat: M.copper, color: P.copperLight, mode: 'over' });
  // main housing
  b.draw(rect(5, 14, 22, 15, 1.5), { z: 2, h: 10, bevel: 2, color: P.yellow, wear: 0.65, seed: 9 });
  b.draw(rect(7.5, 16.5, 11, 10), { z: 11.4, h: 0.4, color: mix(P.yellow, P.yellowDark, 0.35), mode: 'over', wear: 0.4, seed: 10 });
  for (let i = 0; i < 4; i++) b.draw(rect(20.5, 16.5 + i * 2.6, 5, 1), { h: 1.4, mode: 'carve', color: P.black });
  b.draw(circle(9.5, 18.5, 0.6), { z: 12, h: 0.6, color: P.steel, mat: M.steel, mode: 'over' });
  b.draw(circle(16.5, 18.5, 0.6), { z: 12, h: 0.6, color: P.steel, mat: M.steel, mode: 'over' });
  b.draw(circle(9.5, 24.5, 0.6), { z: 12, h: 0.6, color: P.steel, mat: M.steel, mode: 'over' });
  b.draw(circle(16.5, 24.5, 0.6), { z: 12, h: 0.6, color: P.steel, mat: M.steel, mode: 'over' });
  // control box
  b.draw(rect(27.5, 17, 6, 12, 1), { z: 2, h: 12, color: P.machineGrey, wear: 0.4, seed: 12 });
  b.draw(rect(28.5, 18.5, 4, 3), { z: 14, h: 0.3, mode: 'over', color: hex('#0b1a10'), emissive: (_x, y) => ((Math.floor(y * 2) % 2 === 0) ? hex('#7dff9a') : hex('#2b8a45')) });
  b.draw(circle(30.5, 25, 1.3), { z: 14, h: 1.2, profile: 'round', radius: 1.3, mat: M.plastic, color: P.red, mode: 'over' });
  // forming head (the bender arm on top is a separate moving part)
  b.draw(rect(11, 28, 12, 6, 1), { z: 2, h: 8, mat: M.steel, color: P.steelDark, seed: 14 });
  b.draw(circle(17, 31, 2.8), { z: 10, h: 1.6, profile: 'round', radius: 1.5, mat: M.chrome, color: P.chrome, mode: 'over' });
  // cable from control box
  b.draw(capsule(30, 29, 31, 34, 0.8), { z: 1, h: 1.6, profile: 'round', radius: 0.8, mat: M.rubber, color: P.rubber });
  return b.bake({ ay: 20 });
}

/** The AutoClipper's bender arm, pointing right from its pivot at the sprite centre. */
export function autoArm(): Sprite {
  const b = new SpriteBuilder(12, 4);
  b.draw(capsule(6, 2, 10.6, 2, 0.9), { z: 0, h: 1.4, profile: 'round', radius: 0.9, mat: M.chrome, color: P.chrome });
  b.draw(circle(6, 2, 1.2), { z: 0, h: 1.8, profile: 'round', radius: 1.2, mat: M.steel, color: P.steel });
  return b.bake({ outline: 0.5 });
}
/** Pivot of the arm relative to the AutoClipper's anchor. */
export const AUTO_ARM_PIVOT = { x: -1, y: 11 };

function treadBump(x: number, y: number): boolean {
  // diamond tread plate: alternating short diagonal bars
  const cx = Math.floor(x / 4), cy = Math.floor(y / 4);
  const lx = x - cx * 4 - 2, ly = y - cy * 4 - 2;
  const dir = (cx + cy) % 2 === 0 ? 1 : -1;
  return Math.abs(lx * dir - ly) < 0.7 && Math.abs(lx + ly * dir) < 1.6;
}

// ---- MegaClipper -----------------------------------------------------------------
export function megaClipper(): Sprite {
  const b = new SpriteBuilder(78, 74);
  const stroke = 0;
  // tread pad
  b.draw(box(39, 38, 36, 34, 2), { h: 3, mat: M.steel, color: (x, y) => (treadBump(x, y) ? P.steel : P.steelDark), height: (x, y) => 2.4 + (treadBump(x, y) ? 0.6 : 0), seed: 21 });
  b.draw(subtract(box(39, 38, 36, 34, 2), box(39, 38, 33, 31, 1)), { z: 0, h: 3.2, color: hazard, wear: 0.6, mode: 'over', seed: 22 });
  // die bed
  b.draw(rect(18, 24, 42, 28, 1), { z: 3, h: 6, mat: M.cast, color: P.steelDeep, seed: 23 });
  for (let i = 0; i < 5; i++) b.draw(rect(21 + i * 8, 26, 4, 24), { h: 1.5, mode: 'carve', color: P.black });
  // (the ram is a separate moving part drawn over the die bed)
  // four posts
  for (const [x, y] of [[6, 8], [64, 8], [6, 58], [64, 58]]) b.draw(rect(x, y, 9, 9, 1), { z: 3, h: 34, bevel: 2, color: P.yellow, wear: 0.7, seed: x + y });
  // crown beams
  b.draw(rect(6, 8, 67, 11, 1.5), { z: 26, h: 12, bevel: 2, color: P.yellow, wear: 0.7, seed: 31 });
  b.draw(rect(6, 57, 67, 11, 1.5), { z: 26, h: 12, bevel: 2, color: P.yellow, wear: 0.7, seed: 32 });
  b.draw(rect(8, 10.5, 63, 2.2), { z: 38, h: 0.3, color: hazard, mode: 'over' });
  b.draw(rect(8, 63.5, 63, 2.2), { z: 38, h: 0.3, color: hazard, mode: 'over' });
  // hydraulic cylinders on the crowns
  for (const [x, y] of [[24, 13.5], [54, 13.5], [24, 62.5], [54, 62.5]]) {
    b.draw(circle(x, y, 5.2), { z: 38, h: 6, profile: 'round', radius: 3, mat: M.steel, color: P.steelDark });
    b.draw(circle(x, y, 2.4), { z: 44, h: 1.5, profile: 'round', radius: 2.4, mat: M.chrome, color: P.chrome });
  }
  // hoses
  b.draw(capsule(24, 18.5, 30, 24 + stroke * 2, 1.1), { z: 22, h: 2, profile: 'round', radius: 1.1, mat: M.rubber, color: P.rubber });
  b.draw(capsule(54, 18.5, 48, 24 + stroke * 2, 1.1), { z: 22, h: 2, profile: 'round', radius: 1.1, mat: M.rubber, color: P.rubber });
  // control cabinet and beacon
  b.draw(rect(70, 28, 7, 20, 1), { z: 3, h: 18, color: P.machineGrey, wear: 0.4, seed: 33 });
  b.draw(rect(71, 30, 5, 4), { z: 21, h: 0.3, mode: 'over', color: hex('#0b1a10'), emissive: hex('#9dffb0') });
  b.draw(circle(73.5, 42, 2.2), { z: 21, h: 2.5, profile: 'round', radius: 2.2, mat: M.glass, color: hex('#d98a1a') });
  return b.bake({ ay: 38 });
}

/** The MegaClipper's ram plate. */
export function megaRam(): Sprite {
  const b = new SpriteBuilder(40, 32);
  b.draw(rect(1, 1, 38, 30, 1.5), { h: 4, mat: M.steel, color: P.steelDark, seed: 24 });
  b.draw(rect(4, 4, 32, 24, 1), { z: 4, h: 0.6, mat: M.steel, color: mix(P.steelDark, P.steel, 0.5), mode: 'over', seed: 25 });
  for (let i = 0; i < 4; i++) b.draw(rect(7 + i * 7.5, 7, 3, 18, 1), { z: 4.6, h: 1.2, mat: M.chrome, color: P.chrome, mode: 'over' });
  b.bolts(3, 3, 34, 26, 8.5, 4.6);
  b.draw(rect(14, 27.5, 12, 2), { z: 4.6, h: 0.2, mode: 'paint', color: hazard });
  return b.bake({ outline: 0.6, shadow: 0 });
}
/** Where the ram's centre sits relative to the MegaClipper's anchor. */
export const MEGA_RAM_POS = { x: 0, y: 0 };

// ---- Workbench with arbor press ----------------------------------------------------
export function workbench(): Sprite {
  const b = new SpriteBuilder(70, 46);
  const grain = (x: number, y: number): RGB => {
    const g = fbm(x * 0.12, y * 1.6, 3, 41, 3);
    const ring_ = Math.sin(y * 1.3 + g * 8) * 0.5 + 0.5;
    return mix(P.wood, P.woodDark, ring_ * 0.45 + (hash2(Math.floor(x / 14), 0, 4) - 0.5) * 0.3);
  };
  // legs peeking out
  for (const [x, y] of [[4, 6], [62, 6], [4, 36], [62, 36]]) b.draw(rect(x, y, 4, 4), { h: 13, mat: M.steel, color: P.steelDark });
  // bench top
  b.draw(rect(2, 6, 66, 34, 1), { h: 14, bevel: 1.5, mat: M.wood, color: grain, grain: 0.08, seed: 40 });
  for (let x = 2; x < 68; x += 16.5) b.draw(rect(x, 6, 0.7, 34), { h: 0.6, mode: 'carve', color: P.black });
  // pegboard at the back with hanging tools
  b.draw(rect(2, 1, 66, 5), { h: 26, bevel: 1, color: P.machineGrey, seed: 42 });
  for (let x = 5; x < 66; x += 3) b.draw(circle(x, 3.5, 0.45), { h: 1, mode: 'carve', color: P.black });
  b.draw(capsule(12, 2, 12, 6, 0.8), { z: 26, h: 1.5, mat: M.rubber, color: P.red, mode: 'over' });
  b.draw(capsule(50, 2, 54, 5, 0.7), { z: 26, h: 1.5, mat: M.chrome, color: P.chrome, mode: 'over' });
  // arbor press (cast iron, green) with a lever that pulls on each hand-made clip
  b.draw(rect(16, 12, 16, 18, 1.5), { z: 14, h: 4, mat: M.cast, color: P.castGreen, wear: 0.5, seed: 43 });
  b.draw(rect(19, 12, 9, 9, 1.5), { z: 18, h: 13, bevel: 2, mat: M.cast, color: P.castGreen, wear: 0.5, seed: 44 });
  b.draw(circle(23.5, 22, 3), { z: 18, h: 5, profile: 'round', radius: 2, mat: M.chrome, color: P.chrome });
  b.draw(circle(28, 16, 2), { z: 30, h: 2, profile: 'round', radius: 2, mat: M.steel, color: P.steel });
  // tray of finished clips
  b.draw(rect(42, 18, 15, 11, 1), { z: 14, h: 3, mat: M.steel, color: P.steel, seed: 46 });
  b.draw(rect(43.5, 19.5, 12, 8), { z: 14, h: 0.6, mode: 'over', mat: M.steel, color: P.steelDeep });
  const r = mulberry(7);
  for (let i = 0; i < 9; i++) clipShape(b, 45 + r() * 9, 21 + r() * 5, r() * Math.PI, 14.8);
  // small wire coil
  b.draw(ring(9, 24, 4.2, 2.6), { z: 14, h: 2.4, profile: 'round', radius: 1.3, mat: M.copper, color: P.copper });
  // coffee mug
  b.draw(capsule(61.5, 12, 63.5, 12, 0.7), { z: 17, h: 1, mat: M.plastic, color: P.white });
  b.draw(circle(59, 12, 2.8), { z: 14, h: 6, profile: 'flat', bevel: 0.8, mat: M.plastic, color: P.white });
  b.draw(circle(59, 12, 2), { z: 18.5, h: 0.5, mat: M.glass, color: hex('#2a160b'), mode: 'over' });
  // clipboard
  b.draw(rect(42, 31, 10, 8), { z: 14, h: 0.6, mat: M.wood, color: P.ply, mode: 'over' });
  b.draw(rect(43, 32.5, 8, 6), { z: 14.6, h: 0.2, mat: M.paper, color: hex('#e8e4d6'), mode: 'over' });
  for (let i = 0; i < 4; i++) b.draw(rect(44, 33.5 + i * 1.3, 5 + (i % 2), 0.35), { mode: 'paint', color: hex('#7c7f88') });
  // pliers
  b.draw(capsule(31, 34, 37, 30, 0.7), { z: 14, h: 1, mat: M.rubber, color: P.red });
  b.draw(capsule(31, 35.5, 37.5, 32, 0.7), { z: 14, h: 1, mat: M.rubber, color: P.red });
  b.draw(capsule(37, 30.5, 40, 29, 0.6), { z: 14.5, h: 1, mat: M.chrome, color: P.chrome });
  return b.bake({ ay: 23 });
}

/** The arbor press lever, pointing right from its pivot at the sprite's left-centre. */
export function benchLever(): Sprite {
  const b = new SpriteBuilder(30, 6);
  b.draw(capsule(15, 3, 27, 3, 0.9), { h: 1.5, profile: 'round', radius: 0.9, mat: M.chrome, color: P.chrome });
  b.draw(circle(27.2, 3, 1.8), { h: 2, profile: 'round', radius: 1.8, mat: M.plastic, color: P.red });
  b.draw(circle(15, 3, 1.6), { h: 2.2, profile: 'round', radius: 1.6, mat: M.steel, color: P.steel });
  return b.bake({ outline: 0.6 });
}
/** Lever pivot relative to the bench anchor. */
export const BENCH_LEVER_PIVOT = { x: -7, y: -7 };

/** A tiny paperclip shape, used on the bench and in bins. */
function clipShape(b: SpriteBuilder, x: number, y: number, a: number, z: number): void {
  const outer = rotate(capsule(x - 1.8, y, x + 1.8, y, 1.1), x, y, a);
  b.draw((px, py) => Math.abs(outer(px, py)) - 0.32, { z, h: 0.6, mat: M.chrome, color: P.chrome, mode: 'over' });
}

// ---- Wire spool (cable drum on an A-frame stand) ------------------------------------
export function wireSpool(fill = 1): Sprite {
  const b = new SpriteBuilder(52, 54);
  const cy = 27, R = 19;
  const cyl = (r: number) => (_x: number, y: number) => Math.sqrt(Math.max(0, r * r - (y - cy) * (y - cy)));
  // stand
  for (const x of [3, 45]) {
    b.draw(rect(x, 6, 4, 42, 1), { h: 3, color: P.machineGrey, wear: 0.5, seed: x });
    b.draw(capsule(x + 2, 8, x + 2, cy, 1.6), { z: 3, h: 2, height: (_x, y) => 2 + (y - 8) / (cy - 8) * 17, color: P.machineGrey, wear: 0.5 });
    b.draw(capsule(x + 2, 46, x + 2, cy, 1.6), { z: 3, h: 2, height: (_x, y) => 2 + (46 - y) / (46 - cy) * 17, color: P.machineGrey, wear: 0.5 });
  }
  b.draw(capsule(4, cy, 48, cy, 1.6), { z: 20, h: 3, profile: 'round', radius: 1.6, mat: M.chrome, color: P.chrome });
  // flanges (plywood discs seen edge-on)
  for (const x of [8, 39]) {
    b.draw(rect(x, cy - R, 5, R * 2), { z: 2, height: cyl(R), mat: M.wood, color: (px, py) => mix(P.ply, P.woodDark, fbm(px, py * 0.3, 4, 51, 3) * 0.5) });
    b.draw(circle(x + 2.5, cy, 2.2), { z: 2 + R, h: 1, profile: 'round', radius: 2, mat: M.steel, color: P.steel, mode: 'over' });
  }
  // copper windings; rotating marks show the drum turning
  const rw = 4 + fill * 12;
  b.draw(rect(13, cy - rw, 26, rw * 2), {
    z: 2, height: cyl(rw + 2), mat: M.copper,
    color: (x, y) => {
      const turn = Math.floor(x * 2.8) % 2 === 0 ? 1 : 0.84;
      return scale(mix(P.copper, P.copperLight, fbm(x, y, 5, 52, 2) * 0.5), turn);
    },
    grain: 0.04,
  });
  // tag label on a flange
  b.draw(rect(40, cy - 6, 3, 6), { z: 2 + R, h: 0.2, mode: 'paint', color: P.white });
  return b.bake({ ay: cy });
}
/** Winding area of the spool relative to its anchor, for the rotation marks. */
export const SPOOL_WINDINGS = { x0: -13, x1: 13, r: 16 };

export function sparePallet(count: number): Sprite {
  const b = new SpriteBuilder(42, 34);
  palletBase(b, 1, 1, 40, 32);
  const spots = [[11, 11], [31, 11], [11, 24], [31, 24]];
  for (let i = 0; i < Math.min(count, 4); i++) {
    const [x, y] = spots[i];
    b.draw(circle(x, y, 8.5), { z: 4, h: 3, profile: 'flat', bevel: 1, mat: M.wood, color: P.ply });
    b.draw(ring(x, y, 5.6, 4.2), { z: 6.5, h: 3, profile: 'round', radius: 2.1, mat: M.copper, color: P.copper });
    b.draw(circle(x, y, 2.4), { z: 7, h: 0.4, mode: 'over', mat: M.wood, color: P.woodDark });
  }
  return b.bake();
}

function palletBase(b: SpriteBuilder, x0: number, y0: number, w: number, h: number): void {
  for (let i = 0; i < 5; i++) {
    b.draw(rect(x0, y0 + i * (h - 4) / 4, w, 4), { h: 4, mat: M.wood, color: (x, y) => mix(P.ply, P.wood, fbm(x * 0.3, y * 2, 4, 61 + i, 2) * 0.7), seed: 60 + i });
  }
}

// ---- Clip bin --------------------------------------------------------------------
export function clipBin(fill: number): Sprite {
  const b = new SpriteBuilder(46, 42);
  b.draw(rect(2, 3, 42, 36, 2), { h: 3, mat: M.steel, color: P.steelDark });
  // pile of clips (a mound made of tiny clips)
  if (fill > 0) {
    const r = mulberry(17);
    const top = 3 + fill * 14;
    b.draw(rect(6, 7, 34, 28, 3), { z: 3, height: (x, y) => top * Math.max(0.15, 1 - (((x - 23) / 20) ** 2 + ((y - 21) / 17) ** 2)), mat: M.steel, color: hex('#7b858c'), grain: 0.25 });
    for (let i = 0; i < 70 * Math.max(0.3, fill); i++) {
      const x = 8 + r() * 30, y = 9 + r() * 24;
      const hz = top * Math.max(0.15, 1 - (((x - 23) / 20) ** 2 + ((y - 21) / 17) ** 2));
      clipShape(b, x, y, r() * Math.PI, 3 + hz);
    }
  }
  // walls
  const wall = subtract(rect(2, 3, 42, 36, 2), rect(6, 7, 34, 28, 1));
  b.draw(wall, { h: 17, bevel: 1.5, color: P.machineGrey, wear: 0.6, seed: 71 });
  b.draw(subtract(rect(2, 34, 42, 5, 1), rect(6, 34, 34, 1)), { z: 17, h: 0.3, mode: 'paint', color: hazard });
  // forklift pockets
  b.draw(rect(10, 38, 7, 1.5), { h: 2, mode: 'carve', color: P.black });
  b.draw(rect(29, 38, 7, 1.5), { h: 2, mode: 'carve', color: P.black });
  return b.bake({ ay: 21 });
}

// ---- Server rack ---------------------------------------------------------------------
export function serverRack(memory: boolean): Sprite {
  const b = new SpriteBuilder(22, 38);
  b.draw(rect(1, 1, 20, 35, 1), { h: 30, bevel: 1.5, mat: M.paint, color: P.rackBlack, wear: 0.2, seed: memory ? 81 : 82 });
  for (let y = 4; y < 26; y += 2) b.draw(rect(4, y, 14, 0.8), { h: 1, mode: 'carve', color: P.black });
  b.draw(rect(4, 27, 14, 2), { z: 30, h: 0.3, mode: 'over', color: memory ? P.blue : hex('#2c6b3f') });
  b.draw(rect(3, 31, 16, 4), { z: 30, h: 0.3, mode: 'over', mat: M.glass, color: hex('#0b0d10') });
  // cables out of the back
  b.draw(capsule(6, 1, 5, -3, 0.9), { z: 22, h: 1.5, mat: M.rubber, color: hex('#2b4fa0'), mode: 'over' });
  b.draw(capsule(11, 1, 12, -3, 0.9), { z: 22, h: 1.5, mat: M.rubber, color: hex('#d1a024'), mode: 'over' });
  b.draw(capsule(16, 1, 17, -3, 0.9), { z: 22, h: 1.5, mat: M.rubber, color: P.rubber, mode: 'over' });
  return b.bake({ ay: 19 });
}
/** LED positions inside a rack sprite (relative to its anchor) for the renderer to blink. */
export const RACK_LEDS: [number, number][] = [[-7, 14], [-4, 14], [-1, 14], [2, 14], [5, 14], [-7, 15.6], [-4, 15.6], [-1, 15.6], [2, 15.6], [5, 15.6]];

// ---- Delivery truck (cab towards +y when facing down) -------------------------------
export function truck(down: boolean, loaded: boolean): Sprite {
  const b = new SpriteBuilder(32, 62);
  const f = (y: number) => (down ? y : 62 - y); // flips the model for the upward truck
  const R = (x: number, y: number, w: number, h: number, r = 0) => rect(x, down ? y : 62 - y - h, w, h, r);
  // wheels peeking out
  for (const [x, y] of [[1, 8], [27, 8], [1, 30], [27, 30], [1, 47], [27, 47]]) b.draw(R(x, y, 4, 8, 1.5), { h: 6, profile: 'round', radius: 2, mat: M.rubber, color: P.rubber });
  // cargo box with corrugated roof
  b.draw(R(3, 2, 26, 40, 1.5), { h: 22, bevel: 1.5, color: (_x, y) => mix(P.white, hex('#b9bdb8'), Math.floor(f(y) / 3) % 2 ? 0.15 : 0), height: (_x, y) => 22 + (Math.floor(f(y) / 3) % 2 ? 0.6 : 0), wear: 0.3, seed: down ? 91 : 92 });
  // painted logo: a big red paperclip
  const lc = f(22);
  const outer = capsule(16, lc - 9, 16, lc + 9, 6.2);
  const inner = capsule(16, lc - 6.5, 16, lc + 5, 3.4);
  b.draw((x, y) => Math.max(Math.abs(outer(x, y)) - 1.1, -1e9), { mode: 'paint', color: P.red });
  b.draw((x, y) => Math.abs(inner(x, y)) - 1.1, { mode: 'paint', color: P.red });
  if (loaded) b.draw(R(9, 37, 14, 3), { z: 22, h: 0.3, mode: 'paint', color: hex('#e8c040') });
  // cab
  b.draw(R(4, 43, 24, 17, 4), { h: 16, bevel: 3, color: hex('#2f6aa3'), wear: 0.3, seed: 93 });
  b.draw(R(6, 52, 20, 5, 2), { z: 12, h: 3, mat: M.glass, color: P.glass, mode: 'over' });
  b.draw(R(1, 48, 3, 2), { z: 12, h: 1.5, mat: M.rubber, color: P.rubber });
  b.draw(R(28, 48, 3, 2), { z: 12, h: 1.5, mat: M.rubber, color: P.rubber });
  b.draw(R(7, 45, 18, 1.5), { z: 16, h: 0.8, mat: M.plastic, color: hex('#d98a1a'), mode: 'over' });
  return b.bake({ ay: 31 });
}
export const TRUCK_LIGHTS_DOWN: [number, number][] = [[-8, 30], [8, 30]];

// ---- Conveyor belts -------------------------------------------------------------------
export function beltH(): Sprite {
  // A 40 px strip whose pattern repeats every 8 px; the renderer slides a 32 px window over it.
  const b = new SpriteBuilder(40, 14);
  b.draw(rect(0, 0, 40, 2.5), { h: 6, mat: M.steel, color: P.steel, seed: 101 });
  b.draw(rect(0, 11.5, 40, 2.5), { h: 6, mat: M.steel, color: P.steel, seed: 101 });
  b.draw(rect(0, 2.5, 40, 9), { h: 4, mat: M.rubber, color: (x) => ((x % 8) < 1.2 ? hex('#30343a') : P.rubber), height: (x) => 4 + ((x % 8) < 1.2 ? 0.6 : 0), grain: 0.12 });
  for (let x = 4; x < 40; x += 8) {
    b.draw(circle(x, 1.25, 1), { z: 6, h: 0.6, mat: M.chrome, color: P.chrome, mode: 'over' });
    b.draw(circle(x, 12.75, 1), { z: 6, h: 0.6, mat: M.chrome, color: P.chrome, mode: 'over' });
  }
  return b.bake({ outline: 0, ax: 0, ay: 7 });
}

export function beltV(): Sprite {
  const b = new SpriteBuilder(14, 40);
  b.draw(rect(0, 0, 2.5, 40), { h: 6, mat: M.steel, color: P.steel, seed: 103 });
  b.draw(rect(11.5, 0, 2.5, 40), { h: 6, mat: M.steel, color: P.steel, seed: 103 });
  b.draw(rect(2.5, 0, 9, 40), { h: 4, mat: M.rubber, color: (_x, y) => ((y % 8) < 1.2 ? hex('#30343a') : P.rubber), height: (_x, y) => 4 + ((y % 8) < 1.2 ? 0.6 : 0), grain: 0.12 });
  for (let y = 4; y < 40; y += 8) {
    b.draw(circle(1.25, y, 1), { z: 6, h: 0.6, mat: M.chrome, color: P.chrome, mode: 'over' });
    b.draw(circle(12.75, y, 1), { z: 6, h: 0.6, mat: M.chrome, color: P.chrome, mode: 'over' });
  }
  return b.bake({ outline: 0, ax: 7, ay: 0 });
}

export function clipSprite(): Sprite {
  const b = new SpriteBuilder(9, 6);
  clipShape(b, 4.5, 3, 0, 0);
  return b.bake({ outline: 0.4 });
}

// ---- Props ----------------------------------------------------------------------------
export function pillar(): Sprite {
  const b = new SpriteBuilder(30, 30);
  b.draw(rect(2, 2, 26, 26, 1), {
    h: 70, bevel: 4, mat: M.concrete,
    color: (x, y, d) => (d < 4 ? hazard(x, y) : mix(P.concrete, hex('#6c6e6b'), fbm(x, y, 6, 111, 3))),
    grain: 0.1, seed: 110,
  });
  return b.bake({ shadow: 0.35 });
}

export function barrel(color: RGB, seed: number): Sprite {
  const b = new SpriteBuilder(22, 22);
  b.draw(circle(11, 11, 9.5), { h: 18, bevel: 2, color, wear: 0.55, seed });
  b.draw(ring(11, 11, 7.5, 0.8), { h: 0.8, mode: 'carve', color: P.black });
  b.draw(ring(11, 11, 4.5, 0.7), { h: 0.6, mode: 'carve', color: P.black });
  b.draw(circle(14.5, 8, 1.4), { z: 18, h: 0.8, mat: M.steel, color: P.steel, mode: 'over' });
  b.draw(circle(7, 14, 0.9), { z: 18, h: 0.6, mat: M.steel, color: P.steel, mode: 'over' });
  return b.bake();
}

export function boxPallet(seed: number): Sprite {
  const b = new SpriteBuilder(42, 34);
  palletBase(b, 1, 1, 40, 32);
  const r = mulberry(seed);
  const boxes: [number, number, number, number][] = [[3, 3, 17, 13], [21, 3, 18, 13], [3, 17, 17, 14], [21, 17, 18, 14]];
  for (const [x, y, w, h] of boxes) {
    if (r() < 0.15) continue;
    const z = 4, hh = 10 + Math.floor(r() * 6);
    b.draw(rect(x, y, w, h, 0.5), { z, h: hh, bevel: 1, mat: M.paper, color: mix(P.cardboard, hex('#8f6a3f'), r() * 0.4), seed: x * y });
    b.draw(rect(x + w / 2 - 1.2, y, 2.4, h), { z: z + hh, h: 0.2, mode: 'paint', color: hex('#c9b27c') });
    if (r() < 0.5) b.draw(rect(x + 2, y + 2, 5, 3), { mode: 'paint', color: hex('#e8e4d6') });
  }
  return b.bake();
}

export function forklift(): Sprite {
  const b = new SpriteBuilder(30, 50);
  b.draw(rect(13, 0, 1.8, 16), { h: 2, mat: M.steel, color: P.steelDark });
  b.draw(rect(17, 0, 1.8, 16), { h: 2, mat: M.steel, color: P.steelDark });
  b.draw(rect(9, 13, 14, 4), { h: 12, mat: M.steel, color: P.steelDark });
  for (const [x, y] of [[3, 18], [24, 18], [4, 38], [23, 38]]) b.draw(rect(x, y, 4, 8, 1.5), { h: 6, profile: 'round', radius: 2, mat: M.rubber, color: P.rubber });
  b.draw(rect(6, 16, 20, 30, 3), { h: 10, bevel: 2, color: P.yellow, wear: 0.6, seed: 121 });
  b.draw(rect(8, 36, 16, 10, 2), { z: 10, h: 5, color: P.yellowDark, wear: 0.5, seed: 122 });
  b.draw(rect(8, 20, 16, 15, 1), { z: 10, h: 12, bevel: 1, mat: M.steel, color: P.steelDeep, height: (x, y) => ((x - 8) % 5 < 1 || (y - 20) % 7 < 1 ? 12 : 0.5) });
  b.draw(circle(16, 29, 3.2), { z: 10, h: 3, mat: M.rubber, color: P.rubber });
  return b.bake({ ay: 25 });
}

/** A floor worker seen from above: hard hat, hi-vis vest, arms. `step` swings the arms. */
export function worker(step: number, hat: RGB): Sprite {
  const b = new SpriteBuilder(14, 12);
  const sw = Math.sin(step * Math.PI * 2) * 1.6;
  b.draw(capsule(3, 6 + sw, 5, 6 + sw * 0.5, 1.1), { h: 9, profile: 'round', radius: 1.1, mat: M.paint, color: hex('#3c4a5e') });
  b.draw(capsule(11, 6 - sw, 9, 6 - sw * 0.5, 1.1), { h: 9, profile: 'round', radius: 1.1, mat: M.paint, color: hex('#3c4a5e') });
  b.draw(ellipse(7, 6, 4.2, 2.8), { h: 12, profile: 'round', radius: 2.2, mat: M.paint, color: hex('#e2741e') });
  b.draw(rect(3.4, 5.4, 7.2, 1.1), { z: 13, h: 0.2, mode: 'paint', color: hex('#e6eee0') });
  b.draw(circle(7, 6, 2.3), { z: 12, h: 3, profile: 'round', radius: 2.3, mat: M.plastic, color: hat });
  return b.bake({ outline: 0.6, ay: 6 });
}

// ---- Floor -------------------------------------------------------------------------------
/** A tileable polished-concrete slab with expansion joints along its edges. */
export function floorTile(seed: number): HTMLCanvasElement {
  const S = 128 * 2; // two texels per world pixel
  const c = makeCanvas(S, S);
  const g = c.getContext('2d')!;
  const im = g.createImageData(S, S);
  const base = hex('#545a5c');
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const n = fbm(x, y, 80, seed, 4, S);
      const fine = fbm(x, y, 5, seed + 9, 2, S);
      const blot = fbm(x, y, 36, seed + 20, 3, S);
      let k = 0.8 + n * 0.3 + (fine - 0.5) * 0.12;
      if (blot > 0.7) k *= 1 - (blot - 0.7) * 0.8; // stains
      if (hash2(x, y, seed) > 0.985) k *= 1.15; // aggregate flecks
      const joint = x <= 1 || y <= 1 ? 0.55 : x <= 3 || y <= 3 ? 0.82 : x >= S - 2 || y >= S - 2 ? 1.1 : 1;
      const i = (y * S + x) * 4;
      im.data[i] = Math.round(base[0] * 255 * k * joint);
      im.data[i + 1] = Math.round(base[1] * 255 * k * joint);
      im.data[i + 2] = Math.round(base[2] * 255 * k * joint);
      im.data[i + 3] = 255;
    }
  }
  g.putImageData(im, 0, 0);
  // scuffs
  const r = mulberry(seed + 5);
  g.globalAlpha = 0.18;
  g.strokeStyle = '#1d1f1e';
  for (let i = 0; i < 6; i++) {
    g.lineWidth = 1.2 + r() * 2.4;
    g.beginPath();
    const x = r() * S, y = r() * S, a = r() * Math.PI, l = 12 + r() * 52;
    g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + r() * 6, y + Math.sin(a) * l * 0.5 + r() * 6, x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
  }
  g.globalAlpha = 1;
  return c;
}

export function asphaltTile(): HTMLCanvasElement {
  const S = 64;
  const c = makeCanvas(S, S);
  const g = c.getContext('2d')!;
  const im = g.createImageData(S, S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const k = 0.75 + fbm(x, y, 16, 131, 3, S) * 0.3 + (hash2(x, y, 132) - 0.5) * 0.18;
    const i = (y * S + x) * 4;
    im.data[i] = 38 * k; im.data[i + 1] = 40 * k; im.data[i + 2] = 44 * k; im.data[i + 3] = 255;
  }
  g.putImageData(im, 0, 0);
  return c;
}

/** Worn stencil paint on the floor. */
export function stencil(text: string, color: string, size: number, seed: number): HTMLCanvasElement {
  const pad = 4;
  const m = makeCanvas(10, 10).getContext('2d')!;
  m.font = `700 ${size}px "Chakra Petch", "Arial Narrow", sans-serif`;
  const w = Math.ceil(m.measureText(text).width) + pad * 2;
  const h = Math.ceil(size * 1.2) + pad * 2;
  const c = makeCanvas(w, h);
  const g = c.getContext('2d')!;
  g.font = m.font;
  g.textBaseline = 'middle';
  g.fillStyle = color;
  g.fillText(text, pad, h / 2 + 1);
  const im = g.getImageData(0, 0, w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4 + 3;
    const n = fbm(x, y, 5, seed, 3);
    im.data[i] = Math.round(im.data[i] * Math.max(0, Math.min(1, (n - 0.25) * 2.2)) * 0.85);
  }
  g.putImageData(im, 0, 0);
  return c;
}

/** An oil stain decal. */
export function stain(seed: number, size: number): HTMLCanvasElement {
  const c = makeCanvas(size, size);
  const g = c.getContext('2d')!;
  const im = g.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = (x - size / 2) / (size / 2), dy = (y - size / 2) / (size / 2);
    const r = Math.hypot(dx, dy) + (fbm(x, y, size / 4, seed, 3) - 0.5) * 0.9;
    const a = Math.max(0, 1 - r) * 0.55;
    const i = (y * size + x) * 4;
    im.data[i] = 12; im.data[i + 1] = 12; im.data[i + 2] = 10; im.data[i + 3] = Math.round(a * 255);
  }
  g.putImageData(im, 0, 0);
  return c;
}

// ---- the whole set -------------------------------------------------------------------------
export interface ArtSet {
  auto: Sprite;
  autoArm: Sprite;
  mega: Sprite;
  megaRam: Sprite;
  bench: Sprite;
  benchLever: Sprite;
  spool: Sprite;
  spare: Sprite[];
  bin: Sprite[];
  rackP: Sprite;
  rackM: Sprite;
  truckDown: Sprite;
  truckUp: Sprite;
  beltH: Sprite;
  beltV: Sprite;
  clip: Sprite;
  pillar: Sprite;
  barrels: Sprite[];
  boxes: Sprite[];
  forklift: Sprite;
  workers: Sprite[][];
  floor: HTMLCanvasElement[];
  asphalt: HTMLCanvasElement;
  stains: HTMLCanvasElement[];
}

/** Builds the art set a piece at a time, yielding to the browser between pieces. */
export async function buildArtAsync(onProgress?: (done: number, total: number) => void): Promise<ArtSet> {
  const jobs: [keyof ArtSet, () => unknown][] = [
    ['floor', () => [floorTile(1), floorTile(2), floorTile(3)]],
    ['bench', workbench], ['benchLever', benchLever], ['spool', () => wireSpool()],
    ['bin', () => Array.from({ length: 6 }, (_, i) => clipBin(i / 5))],
    ['asphalt', asphaltTile], ['stains', () => [stain(1, 40), stain(2, 28), stain(3, 56)]],
    ['truckDown', () => truck(true, true)], ['truckUp', () => truck(false, false)],
    ['auto', autoClipper], ['autoArm', autoArm], ['beltH', beltH], ['beltV', beltV], ['clip', clipSprite],
    ['spare', () => [1, 2, 3, 4].map(sparePallet)],
    ['rackP', () => serverRack(false)], ['rackM', () => serverRack(true)],
    ['pillar', pillar], ['barrels', () => [barrel(P.blue, 1), barrel(P.red, 2), barrel(hex('#3e6b3a'), 3)]],
    ['boxes', () => [boxPallet(5), boxPallet(9)]], ['forklift', forklift],
    ['mega', megaClipper], ['megaRam', megaRam],
    ['workers', () => [hex('#e8c33a'), hex('#e9e9e4'), hex('#d8462c')].map((hat) => [0, 0.25, 0.5, 0.75].map((st) => worker(st, hat)))],
  ];
  const art: Partial<Record<keyof ArtSet, unknown>> = {};
  for (let i = 0; i < jobs.length; i++) {
    art[jobs[i][0]] = jobs[i][1]();
    onProgress?.(i + 1, jobs.length);
    await new Promise((r) => setTimeout(r, 0));
  }
  return art as ArtSet;
}


export type { SDF };
export { box, ellipse, poly, union };
