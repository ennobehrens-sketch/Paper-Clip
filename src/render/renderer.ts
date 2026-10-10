// The factory view: draws the floor, machines, conveyors, clips, trucks and lighting
// for the current game state, with a camera that pulls back as the factory grows.

import type { Stage1 } from '../game/stage1';
import { AUTO_ARM_PIVOT, BENCH_LEVER_PIVOT, SPOOL_WINDINGS, asphaltTile, buildArtAsync, RACK_LEDS, stencil, type ArtSet } from './assets';
import { hash2 } from './noise';
import { makeCanvas, type Sprite } from './sprite';
import {
  AISLE, AUTO_CELLS, BENCH, BIN, COMPUTE, CORE, FORKLIFT, MEGA_BIN, MEGA_CELLS, MEGA_HALL, ROAD, SPARE, SPOOL, TRUNK_X,
  memoryPos, pillarSpots, processorPos, type Bounds,
} from './world';

const ZOOM_STEPS = [3, 2, 1.5, 1.25, 1, 0.875, 0.75, 0.625, 0.5, 0.42, 0.35, 0.29, 0.24, 0.2, 0.17, 0.14, 0.12, 0.1];
const BELT_SPEED = 40; // world px per second
const DESIGN_W = 1200; // the view is designed at this CSS width

interface Clip { x: number; y: number; vy: number; phase: 'drop' | 'row' | 'trunk' | 'mrow' | 'mtrunk' | 'fly'; rowY: number; tx?: number; ty?: number; life?: number }
interface Spark { x: number; y: number; vx: number; vy: number; life: number; max: number; hot: number }
interface Placed { y: number; draw: () => void; shadow?: () => void }

export class FactoryView {
  private art!: ArtSet;
  private ready = false;
  private progress = 0;
  private ctx: CanvasRenderingContext2D;
  private light: HTMLCanvasElement;
  private lctx: CanvasRenderingContext2D;
  private lamp: HTMLCanvasElement;
  private glow: HTMLCanvasElement;
  private stencils: Record<string, HTMLCanvasElement>;
  private asphalt: CanvasPattern;
  cam = { x: 0, y: 0, z: 3 };
  private camInit = false;
  private t = 0;
  private clips: Clip[] = [];
  private sparks: Spark[] = [];
  private pressT = -1;
  private spoolSpin = 0;
  private dpr = 1;
  targetZoom = 3;

  constructor(private canvas: HTMLCanvasElement, private game: Stage1) {
    this.ctx = canvas.getContext('2d')!;
    buildArtAsync((d, n) => { this.progress = d / n; }).then((art) => { this.art = art; this.ready = true; });
    this.light = makeCanvas(4, 4);
    this.lctx = this.light.getContext('2d')!;
    this.lamp = radial(128, [[0, 'rgba(255,226,180,1)'], [0.35, 'rgba(255,214,160,0.55)'], [1, 'rgba(255,200,140,0)']]);
    this.glow = radial(64, [[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,255,255,0.5)'], [1, 'rgba(255,255,255,0)']]);
    this.asphalt = this.ctx.createPattern(asphaltTile(), 'repeat')!;
    this.stencils = {
      compute: stencil('COMPUTE', '#d9b33a', 26, 2),
      storage: stencil('STORAGE', '#d9b33a', 26, 1),
      shipping: stencil('SHIPPING', '#e8e6dc', 30, 3),
      mega: stencil('MEGA PRESS HALL', '#d9b33a', 32, 5),
    };
    this.resize();
  }

  resize(): void {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(this.canvas.clientWidth * this.dpr));
    const h = Math.max(1, Math.round(this.canvas.clientHeight * this.dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
      this.light.width = Math.ceil(w / 2);
      this.light.height = Math.ceil(h / 2);
    }
  }

  /** Called when the player clicks Make Paperclip. */
  manualClip(): void {
    this.pressT = 0;
    this.clips.push({ x: BENCH.x + 22, y: BENCH.y - 2, vy: 0, phase: 'fly', rowY: 0, tx: BIN.x - 4, ty: BIN.y - 4, life: 0.55 });
  }

  // ------------------------------------------------------------------ layout from game state

  private layout() {
    const g = this.game;
    const autos = AUTO_CELLS.slice(0, Math.min(g.clipmakerLevel, AUTO_CELLS.length));
    const megas = MEGA_CELLS.slice(0, Math.min(g.megaClipperLevel, MEGA_CELLS.length));
    const showCompute = g.compFlag == 1;
    const procs = showCompute ? Array.from({ length: Math.min(g.processors, 80) }, (_, i) => processorPos(i, g.processors)) : [];
    const mems = showCompute ? Array.from({ length: Math.min(g.memory, 80) }, (_, i) => memoryPos(i, g.memory)) : [];
    const b: Bounds = { x0: -110, x1: 140, y0: -34, y1: 34 };
    if (g.clipsSold > 0) b.x1 = Math.max(b.x1, ROAD.x1 + 4);
    if (g.wire - 1 >= g.wireSupply) b.x0 = Math.min(b.x0, SPARE.x - 24);
    if (showCompute) {
      const minX = Math.min(COMPUTE.right - 72, ...procs.map((p) => p[0]), ...mems.map((p) => p[0]));
      b.x0 = Math.min(b.x0, minX - 18);
      b.y0 = Math.min(b.y0, COMPUTE.y0); b.y1 = Math.max(b.y1, COMPUTE.y1);
    }
    for (const [x, y] of autos) {
      b.x0 = Math.min(b.x0, x - 22); b.x1 = Math.max(b.x1, x + 22);
      b.y0 = Math.min(b.y0, y - 24); b.y1 = Math.max(b.y1, y + 36);
    }
    if (g.megaClipperFlag == 1) {
      b.x1 = Math.max(b.x1, MEGA_HALL.x0 + 100);
      for (const [x, y] of megas) {
        b.x1 = Math.max(b.x1, x + 46); b.y0 = Math.min(b.y0, y - 40); b.y1 = Math.max(b.y1, y + 50);
      }
    }
    return { autos, megas, procs, mems, b };
  }

  private camTarget(b: Bounds) {
    const pad = 34;
    const cssW = this.canvas.width / this.dpr, cssH = this.canvas.height / this.dpr;
    const unit = cssW / DESIGN_W;
    const fit = Math.min(cssW / (b.x1 - b.x0 + pad * 2), cssH / (b.y1 - b.y0 + pad * 2)) / unit;
    let z = ZOOM_STEPS[ZOOM_STEPS.length - 1];
    for (const s of ZOOM_STEPS) if (s <= fit) { z = s; break; }
    return { x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2, z };
  }

  // ------------------------------------------------------------------ frame

  frame(dt: number): void {
    this.resize();
    if (!this.ready) { this.loading(); return; }
    const g = this.game;
    this.t += dt;
    if (this.pressT >= 0) { this.pressT += dt; if (this.pressT > 0.35) this.pressT = -1; }
    const L = this.layout();
    const tg = this.camTarget(L.b);
    this.targetZoom = tg.z;
    if (!this.camInit) { this.cam = { ...tg }; this.camInit = true; }
    const k = Math.min(1, dt * 1.8);
    this.cam.z = Math.exp(Math.log(this.cam.z) + (Math.log(tg.z) - Math.log(this.cam.z)) * k);
    this.cam.x += (tg.x - this.cam.x) * k;
    this.cam.y += (tg.y - this.cam.y) * k;

    const ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;
    const unit = (W / this.dpr) / DESIGN_W;
    const Z = this.cam.z * unit * this.dpr;
    const view: Bounds = { x0: this.cam.x - W / 2 / Z, x1: this.cam.x + W / 2 / Z, y0: this.cam.y - H / 2 / Z, y1: this.cam.y + H / 2 / Z };
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#101214';
    ctx.fillRect(0, 0, W, H);
    ctx.setTransform(Z, 0, 0, Z, W / 2 - this.cam.x * Z, H / 2 - this.cam.y * Z);
    ctx.imageSmoothingEnabled = Math.abs(this.cam.z - Math.round(this.cam.z)) > 0.02 || this.cam.z < 1;

    this.drawFloor(view);
    const working = g.wire >= 1;
    const autoRate = Math.min(3, g.clipperBoost);

    // ---- conveyors
    const rows = new Map<number, [number, number]>();
    for (const [x, y] of L.autos) {
      const r = rows.get(y);
      rows.set(y, r ? [Math.min(r[0], x), Math.max(r[1], x)] : [x, x]);
    }
    let trunkTop = 0, trunkBottom = 0;
    for (const [y, [x0]] of rows) {
      const by = y + 27;
      this.beltH(x0 - 20, TRUNK_X + 7, by, 1);
      trunkTop = Math.min(trunkTop, by);
      trunkBottom = Math.max(trunkBottom, by);
    }
    if (trunkTop < -20) this.beltV(TRUNK_X, trunkTop - 7, BIN.y - 16, 1);
    if (trunkBottom > 20) this.beltV(TRUNK_X, BIN.y + 16, trunkBottom + 7, -1);
    const megaRows = new Map<number, number>();
    for (const [x, y] of L.megas) megaRows.set(y, Math.max(megaRows.get(y) ?? 0, x));
    for (const [y, x1] of megaRows) this.beltH(MEGA_BIN.x, x1 + 30, y + 44, -1);
    if (L.megas.length) {
      const ys = [...megaRows.keys()].map((y) => y + 44);
      const top = Math.min(...ys), bottom = Math.max(...ys);
      if (top < -20) this.beltV(MEGA_BIN.x, top - 7, MEGA_BIN.y - 16, 1);
      if (bottom > 20) this.beltV(MEGA_BIN.x, MEGA_BIN.y + 16, bottom + 7, -1);
    }

    // ---- clips travelling on belts
    this.updateClips(dt);
    for (const c of this.clips) if (c.phase !== 'drop' && c.phase !== 'fly') this.sprite(this.art.clip, c.x, c.y);

    // ---- collect objects, then draw shadows and sprites in depth order
    const placed: Placed[] = [];
    const put = (s: Sprite, x: number, y: number, extra?: () => void) => {
      if (x + s.w < view.x0 - 40 || x - s.w > view.x1 + 40 || y + s.h < view.y0 - 40 || y - s.h > view.y1 + 40) return;
      placed.push({ y, draw: () => { this.sprite(s, x, y); extra?.(); }, shadow: () => this.shadow(s, x, y) });
    };
    // core
    const pull = this.pressT >= 0 ? Math.sin((this.pressT / 0.35) * Math.PI) : 0;
    put(this.art.bench, BENCH.x, BENCH.y, () => this.rotated(this.art.benchLever, BENCH.x + BENCH_LEVER_PIVOT.x, BENCH.y + BENCH_LEVER_PIVOT.y, -0.2 + pull * 1.1));
    const spinRate = working ? Math.min(1.5, (g.clipmakerLevel * g.clipperBoost + g.megaClipperLevel * 500) / 60) : 0;
    this.spoolSpin += dt * spinRate + (this.pressT >= 0 ? dt * 0.8 : 0);
    put(this.art.spool, SPOOL.x, SPOOL.y, () => this.spoolMarks(this.spoolSpin));
    const spares = Math.min(4, Math.floor(Math.max(0, g.wire - 1) / g.wireSupply));
    if (spares > 0) put(this.art.spare[spares - 1], SPARE.x, SPARE.y);
    const levels = this.art.bin.length - 1;
    const binFill = Math.min(levels, Math.ceil((g.unsoldClips / Math.max(500, g.clipRate * 30 + 500)) * levels));
    put(this.art.bin[binFill], BIN.x, BIN.y);
    if (L.megas.length) put(this.art.bin[Math.min(levels, binFill + 1)], MEGA_BIN.x, MEGA_BIN.y);
    for (const [x, y] of L.procs) put(this.art.rackP, x, y);
    for (const [x, y] of L.mems) put(this.art.rackM, x, y);
    // props: a storeroom that gets cleared out for the servers
    if (!g.compFlag) {
      put(this.art.boxes[0], -214, -30);
      put(this.art.boxes[1], -262, 18);
      put(this.art.barrels[0], -214, 30);
      put(this.art.barrels[1], -200, 44);
      put(this.art.barrels[2], -300, -40);
    }
    put(this.art.forklift, FORKLIFT.x, FORKLIFT.y);
    // machines
    for (let i = 0; i < L.autos.length; i++) {
      const [x, y] = L.autos[i];
      const ph = (this.t * autoRate + i * 0.37) % 1;
      put(this.art.auto, x, y, () => this.rotated(this.art.autoArm, x + AUTO_ARM_PIVOT.x, y + AUTO_ARM_PIVOT.y, ph * Math.PI * 2));
      if (working && ph < (dt * autoRate) && this.clips.length < 600) {
        this.clips.push({ x: x - 4, y: y + 14, vy: 50, phase: 'drop', rowY: y + 27 });
        if (hash2(i, Math.floor(this.t), 3) < 0.35) this.spark(x - 1, y + 12, 3);
      }
    }
    for (let i = 0; i < L.megas.length; i++) {
      const [x, y] = L.megas[i];
      const ph = (this.t * 1.4 + i * 0.29) % 1;
      put(this.art.mega, x, y, () => this.megaRam(x, y, 0.5 - 0.5 * Math.cos(ph * Math.PI * 2)));
      if (working && Math.abs(ph - 0.5) < dt * 1.4 && this.clips.length < 700) {
        for (let k = 0; k < 4; k++) this.clips.push({ x: x - 20 + k * 12, y: y + 44, vy: 0, phase: 'mrow', rowY: y + 44 });
        this.spark(x, y + 4, 10);
      }
    }
    // pillars
    const blocked = (x: number, y: number) =>
      (x > COMPUTE.x0 - 40 && x < CORE.x1 + 30 && y > COMPUTE.y0 - 40 && y < COMPUTE.y1 + 40) ||
      (x > AISLE.x0 - 30 && x < AISLE.x1 + 30) ||
      (x > MEGA_HALL.x0 - 30 && y > MEGA_HALL.y0 - 60 && y < MEGA_HALL.y1 + 60) ||
      L.autos.some(([ax, ay]) => Math.abs(ax - x) < 40 && Math.abs(ay - y) < 50);
    for (const [x, y] of pillarSpots(view, blocked)) put(this.art.pillar, x, y);
    // trucks
    const sales = Number.isFinite(g.avgSales) ? g.avgSales : 0;
    const nTrucks = g.clipsSold > 0 ? Math.min(10, 1 + Math.floor(sales / 25)) : 0;
    const len = Math.max(260, view.y1 - ROAD.top + 120);
    const trucks: [number, number, boolean][] = [];
    for (let i = 0; i < nTrucks; i++) {
      const q = ((this.t * 34) / (len * 2) + i / nTrucks) % 1;
      if (q < 0.5) trucks.push([ROAD.laneDown, ROAD.top + 20 + q * 2 * len, true]);
      else trucks.push([ROAD.laneUp, ROAD.top + 20 + (1 - (q - 0.5) * 2) * len, false]);
    }
    for (const [x, y, down] of trucks) put(down ? this.art.truckDown : this.art.truckUp, x, y);
    // workers on their rounds (Stage 1 is still run by people)
    if (g.humanFlag == 1) {
      const routes: Bounds[] = [{ x0: CORE.x0 + 30, y0: -30, x1: CORE.x1 - 6, y1: 30 }];
      if (L.autos.length) routes.push({ x0: L.b.x0 - 14, y0: L.b.y0 - 14, x1: Math.min(L.b.x1, AISLE.x0) - 4, y1: L.b.y1 + 14 });
      if (g.compFlag) routes.push({ x0: COMPUTE.x0 + 10, y0: COMPUTE.y0 + 4, x1: COMPUTE.x1 - 10, y1: COMPUTE.y1 - 4 });
      routes.forEach((r, i) => {
        const [x, y, ang, dist] = walkLoop(r, this.t * 16 + i * 137);
        const frames = this.art.workers[i % this.art.workers.length];
        const s = frames[Math.floor(dist / 5) % frames.length];
        if (x < view.x0 - 20 || x > view.x1 + 20 || y < view.y0 - 20 || y > view.y1 + 20) return;
        placed.push({
          y,
          shadow: () => { this.ctx.fillStyle = 'rgba(5,6,8,0.35)'; this.ctx.beginPath(); this.ctx.ellipse(x + 3, y + 4, 5, 3.4, 0, 0, Math.PI * 2); this.ctx.fill(); },
          draw: () => this.rotated(s, x, y, ang + Math.PI / 2),
        });
      });
    }

    placed.sort((a, b) => a.y - b.y);
    for (const p of placed) p.shadow?.();
    for (const p of placed) p.draw();
    // clips falling off machines and flying from the bench
    for (const c of this.clips) if (c.phase === 'drop' || c.phase === 'fly') this.sprite(this.art.clip, c.x, c.y);

    this.updateSparks(dt);
    this.lighting(view, Z, L, trucks);
  }

  private loading(): void {
    const ctx = this.ctx, W = this.canvas.width, H = this.canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#101214';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#6f9c66';
    ctx.font = `${13 * this.dpr}px "Share Tech Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(`Building the factory floor… ${Math.round(this.progress * 100)}%`, W / 2, H / 2);
    ctx.fillStyle = '#2b333a';
    ctx.fillRect(W / 2 - 100 * this.dpr, H / 2 + 14 * this.dpr, 200 * this.dpr, 3 * this.dpr);
    ctx.fillStyle = '#b8f5a6';
    ctx.fillRect(W / 2 - 100 * this.dpr, H / 2 + 14 * this.dpr, 200 * this.dpr * this.progress, 3 * this.dpr);
    ctx.textAlign = 'start';
  }

  // ------------------------------------------------------------------ pieces

  private drawFloor(v: Bounds): void {
    const ctx = this.ctx;
    const S = 128;
    for (let ty = Math.floor(v.y0 / S); ty <= Math.floor(v.y1 / S); ty++) {
      for (let tx = Math.floor(v.x0 / S); tx <= Math.floor(v.x1 / S); tx++) {
        const variant = Math.floor(hash2(tx, ty, 7) * 3);
        ctx.drawImage(this.art.floor[variant], tx * S, ty * S, S + 0.25, S + 0.25);
        const h = hash2(tx, ty, 11);
        if (h < 0.28) {
          const st = this.art.stains[Math.floor(h * 10) % 3];
          ctx.drawImage(st, tx * S + hash2(tx, ty, 12) * 80, ty * S + hash2(tx, ty, 13) * 80);
        }
      }
    }
    // road
    ctx.fillStyle = this.asphalt;
    ctx.fillRect(ROAD.x0, ROAD.top, ROAD.x1 - ROAD.x0, v.y1 - ROAD.top + 10);
    ctx.fillStyle = 'rgba(232,230,220,0.75)';
    for (let y = ROAD.top + 40; y < v.y1 + 20; y += 28) ctx.fillRect((ROAD.x0 + ROAD.x1) / 2 - 1, y, 2, 14);
    ctx.fillStyle = '#c9a227';
    ctx.fillRect(ROAD.x0 - 3, ROAD.top, 2.5, v.y1 - ROAD.top + 10);
    ctx.fillRect(ROAD.x1 + 0.5, ROAD.top, 2.5, v.y1 - ROAD.top + 10);
    // loading dock hazard band
    for (let i = 0, x = ROAD.x0; x < ROAD.x1; x += 6, i++) {
      ctx.fillStyle = i % 2 ? '#1b1c1e' : '#c9a227';
      ctx.fillRect(x, ROAD.top - 6, Math.min(6, ROAD.x1 - x), 6);
    }
    // safety lines around the assembly area and the server room
    ctx.fillStyle = 'rgba(214,170,40,0.85)';
    const box = (x0: number, y0: number, x1: number, y1: number) => {
      ctx.fillRect(x0, y0, x1 - x0, 2); ctx.fillRect(x0, y1 - 2, x1 - x0, 2);
      ctx.fillRect(x0, y0, 2, y1 - y0); ctx.fillRect(x1 - 2, y0, 2, y1 - y0);
    };
    box(CORE.x0 + 4, CORE.y0 - 4, CORE.x1, CORE.y1 + 4);
    box(COMPUTE.x0, COMPUTE.y0 - 6, COMPUTE.x1, COMPUTE.y1 + 6);
    // stencils
    const st = (k: string, x: number, y: number) => {
      const c = this.stencils[k];
      ctx.drawImage(c, x, y, c.width / 2, c.height / 2);
    };
    ctx.save();
    ctx.translate(ROAD.x0 + 22, ROAD.top + 120);
    ctx.rotate(-Math.PI / 2);
    st('shipping', 0, 0);
    ctx.restore();
    st(this.game.compFlag ? 'compute' : 'storage', COMPUTE.x0 + 6, COMPUTE.y0 - 2);
    if (this.game.megaClipperFlag) st('mega', MEGA_HALL.x0 + 12, MEGA_HALL.y0 - 40);
    if (this.game.megaClipperFlag) {
      ctx.fillStyle = 'rgba(214,170,40,0.85)';
      ctx.fillRect(MEGA_HALL.x0, MEGA_HALL.y0 - 16, 2000, 2);
      ctx.fillRect(MEGA_HALL.x0, MEGA_HALL.y1 + 18, 2000, 2);
      ctx.fillRect(MEGA_HALL.x0, MEGA_HALL.y0 - 16, 2, MEGA_HALL.y1 - MEGA_HALL.y0 + 36);
    }
  }

  /** Belt texture offset (the strip repeats every 8 px); moving +1 samples further left. */
  private beltPhase(dir: number): number {
    const p = (this.t * BELT_SPEED) % 8;
    return dir > 0 ? (8 - p) % 8 : p;
  }

  private beltH(x0: number, x1: number, y: number, dir: number): void {
    const s = this.art.beltH;
    const off = this.beltPhase(dir);
    for (let x = x0; x < x1; x += 32) {
      const w = Math.min(32, x1 - x);
      this.ctx.drawImage(s.img, off * s.res, 0, w * s.res, s.h * s.res, x, y - s.ay, w, s.h);
    }
  }

  private beltV(x: number, y0: number, y1: number, dir: number): void {
    const s = this.art.beltV;
    const off = this.beltPhase(dir);
    for (let y = y0; y < y1; y += 32) {
      const h = Math.min(32, y1 - y);
      this.ctx.drawImage(s.img, 0, off * s.res, s.w * s.res, h * s.res, x - s.ax, y, s.w, h);
    }
  }

  private sprite(s: Sprite, x: number, y: number): void {
    this.ctx.drawImage(s.img, Math.round(x - s.ax), Math.round(y - s.ay), s.w, s.h);
  }

  private rotated(s: Sprite, x: number, y: number, ang: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.drawImage(s.img, -s.ax, -s.ay, s.w, s.h);
    ctx.restore();
  }

  /** The press ram: higher means a wider, softer shadow on the die bed and a slightly bigger plate. */
  private megaRam(x: number, y: number, stroke: number): void {
    const ctx = this.ctx, s = this.art.megaRam;
    const lift = 13 * (1 - stroke) + 4;
    ctx.fillStyle = 'rgba(5,6,8,0.45)';
    ctx.fillRect(x - 19 + lift * 0.38, y - 15 + lift * 0.48, 38, 30);
    const k = 1 + lift * 0.004;
    ctx.drawImage(s.img, x - s.ax * k, y - s.ay * k, s.w * k, s.h * k);
  }

  /** Dark bands sliding round the copper windings so the drum reads as turning. */
  private spoolMarks(spin: number): void {
    const ctx = this.ctx, r = SPOOL_WINDINGS.r;
    for (let k = 0; k < 4; k++) {
      const u = (((spin * 9 + k * (2 * r) / 4) % (2 * r)) + 2 * r) % (2 * r);
      const a = Math.sin((u / (2 * r)) * Math.PI);
      ctx.fillStyle = `rgba(40,16,4,${(0.35 * a).toFixed(3)})`;
      ctx.fillRect(SPOOL.x + SPOOL_WINDINGS.x0, SPOOL.y - r + u, SPOOL_WINDINGS.x1 - SPOOL_WINDINGS.x0, 0.9);
    }
  }

  private shadow(s: Sprite, x: number, y: number): void {
    this.ctx.drawImage(s.shadow, Math.round(x - s.ax), Math.round(y - s.ay), s.shadow.width / s.res, s.shadow.height / s.res);
  }

  private updateClips(dt: number): void {
    const v = BELT_SPEED * dt;
    for (const c of this.clips) {
      switch (c.phase) {
        case 'drop':
          c.y += c.vy * dt;
          if (c.y >= c.rowY) { c.y = c.rowY; c.phase = 'row'; }
          break;
        case 'row':
          c.x += v;
          if (c.x >= TRUNK_X) { c.x = TRUNK_X; c.phase = 'trunk'; }
          break;
        case 'trunk':
          c.y += c.y < BIN.y ? v : -v;
          if (Math.abs(c.y - BIN.y) < 16) c.life = -1;
          break;
        case 'mrow':
          c.x -= v;
          if (c.x <= MEGA_BIN.x) { c.x = MEGA_BIN.x; c.phase = 'mtrunk'; }
          break;
        case 'mtrunk':
          c.y += c.y < MEGA_BIN.y ? v : -v;
          if (Math.abs(c.y - MEGA_BIN.y) < 16) c.life = -1;
          break;
        case 'fly': {
          c.life! -= dt;
          const k = Math.min(1, dt * 7);
          c.x += (c.tx! - c.x) * k;
          c.y += (c.ty! - c.y) * k - Math.sin((c.life! / 0.55) * Math.PI) * 30 * dt;
          if (c.life! <= 0) c.life = -1;
          break;
        }
      }
    }
    this.clips = this.clips.filter((c) => c.life !== -1);
  }

  private spark(x: number, y: number, n: number): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = 20 + Math.random() * 60;
      const max = 0.2 + Math.random() * 0.35;
      this.sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 20, life: max, max, hot: Math.random() });
    }
    if (this.sparks.length > 400) this.sparks.splice(0, this.sparks.length - 400);
  }

  private updateSparks(dt: number): void {
    for (const s of this.sparks) {
      s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 160 * dt; s.vx *= 0.96; s.life -= dt;
    }
    this.sparks = this.sparks.filter((s) => s.life > 0);
  }

  private lighting(view: Bounds, Z: number, L: ReturnType<FactoryView['layout']>, trucks: [number, number, boolean][]): void {
    const ctx = this.ctx, lc = this.lctx, lw = this.light.width, lh = this.light.height;
    const W = this.canvas.width, H = this.canvas.height;
    const sx = lw / W; // light map is half resolution
    const toL = (x: number, y: number): [number, number] => [((x - this.cam.x) * Z + W / 2) * sx, ((y - this.cam.y) * Z + H / 2) * sx];
    lc.globalCompositeOperation = 'source-over';
    lc.fillStyle = 'rgb(70,78,96)';
    lc.fillRect(0, 0, lw, lh);
    lc.globalCompositeOperation = 'lighter';
    const lampAt = (x: number, y: number, r: number, alpha: number) => {
      const [px, py] = toL(x, y);
      const rr = r * Z * sx;
      if (px + rr < 0 || py + rr < 0 || px - rr > lw || py - rr > lh) return;
      lc.globalAlpha = alpha;
      lc.drawImage(this.lamp, px - rr, py - rr, rr * 2, rr * 2);
    };
    // ceiling lamps on a grid
    const GX = 240, GY = 220;
    for (let gx = Math.floor(view.x0 / GX) - 1; gx <= Math.ceil(view.x1 / GX) + 1; gx++) {
      for (let gy = Math.floor(view.y0 / GY) - 1; gy <= Math.ceil(view.y1 / GY) + 1; gy++) {
        const flicker = hash2(gx, gy, 5) < 0.06 ? (Math.sin(this.t * 23 + gx) > 0.6 ? 0.35 : 0.8) : 0.8;
        lampAt(gx * GX + 20, gy * GY + 10, 165, flicker);
      }
    }
    lampAt(BENCH.x, BENCH.y - 6, 95, 0.75); // task light over the bench
    lampAt(ROAD.laneDown + 12, ROAD.top + 10, 120, 0.5);
    // truck headlights
    for (const [x, y, down] of trucks) lampAt(x, y + (down ? 52 : -52), 46, 0.65);
    lc.globalAlpha = 1;
    // apply
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'multiply';
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.light, 0, 0, W, H);

    // additive glows in world space
    ctx.globalCompositeOperation = 'lighter';
    ctx.setTransform(Z, 0, 0, Z, W / 2 - this.cam.x * Z, H / 2 - this.cam.y * Z);
    const glow = (x: number, y: number, r: number, color: string, a: number) => {
      ctx.globalAlpha = a;
      ctx.drawImage(tinted(this.glow, color), x - r, y - r, r * 2, r * 2);
    };
    for (const [i, [x, y]] of [...L.procs, ...L.mems].entries()) {
      for (let k = 0; k < RACK_LEDS.length; k++) {
        if (hash2(i, k, Math.floor(this.t * (4 + (k % 3)))) < 0.55) {
          const [lx, ly] = RACK_LEDS[k];
          glow(x + lx + 0.5, y + ly, 2.2, i < L.procs.length ? '#5cff8a' : '#5ab4ff', 0.9);
        }
      }
    }
    for (const [i, [x, y]] of L.autos.entries()) glow(x + 13.5, y - 0.5, 4, '#7dff9a', 0.35 + 0.15 * Math.sin(this.t * 3 + i));
    for (const [i, [x, y]] of L.megas.entries()) {
      const a = this.t * 4 + i;
      glow(x + 34.5 + Math.cos(a) * 3, y + 4 + Math.sin(a) * 3, 16, '#ffa320', 0.55);
    }
    for (const [x, y, down] of trucks) {
      for (const dx of [-8, 8]) glow(x + dx, y + (down ? 29 : -29), 6, '#fff1c8', 0.9);
      for (const dx of [-9, 9]) glow(x + dx, y + (down ? -29 : 29), 3, '#ff3a2a', 0.8);
    }
    for (const s of this.sparks) {
      const k = s.life / s.max;
      glow(s.x, s.y, 2.5 + k * 2, s.hot > 0.5 ? '#ffd27a' : '#ff8a2a', k);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    // vignette
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }
}

/** Position on a rectangular loop at distance `d`, with heading. */
function walkLoop(r: Bounds, d: number): [number, number, number, number] {
  const w = r.x1 - r.x0, h = r.y1 - r.y0, per = 2 * (w + h);
  const u = ((d % per) + per) % per;
  if (u < w) return [r.x0 + u, r.y0, 0, d];
  if (u < w + h) return [r.x1, r.y0 + (u - w), Math.PI / 2, d];
  if (u < 2 * w + h) return [r.x1 - (u - w - h), r.y1, Math.PI, d];
  return [r.x0, r.y1 - (u - 2 * w - h), -Math.PI / 2, d];
}

function radial(size: number, stops: [number, string][]): HTMLCanvasElement {
  const c = makeCanvas(size, size);
  const g = c.getContext('2d')!;
  const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [o, col] of stops) gr.addColorStop(o, col);
  g.fillStyle = gr;
  g.fillRect(0, 0, size, size);
  return c;
}

const tintCache = new Map<string, HTMLCanvasElement>();
function tinted(src: HTMLCanvasElement, color: string): HTMLCanvasElement {
  let c = tintCache.get(color);
  if (!c) {
    c = makeCanvas(src.width, src.height);
    const g = c.getContext('2d')!;
    g.drawImage(src, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = color;
    g.fillRect(0, 0, c.width, c.height);
    tintCache.set(color, c);
  }
  return c;
}
