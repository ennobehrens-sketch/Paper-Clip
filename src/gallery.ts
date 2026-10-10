// Dev-only page that shows every sprite large, for art iteration.
import { buildArtAsync } from './render/assets';
import type { Sprite } from './render/sprite';

const art = await buildArtAsync();
const Z = 4;
const c = document.getElementById('c') as HTMLCanvasElement;
c.width = 1500; c.height = 1250;
const g = c.getContext('2d')!;
g.imageSmoothingEnabled = true;
// floor
for (let y = 0; y < c.height; y += 128 * 2) for (let x = 0; x < c.width; x += 128 * 2) g.drawImage(art.floor[(x + y) / 256 % 3 | 0], x, y, 256, 256);
const items: [string, Sprite][] = [
  ['bench', art.bench], ['spool', art.spool], ['bin', art.bin[4]], ['auto', art.auto], ['arm', art.autoArm],
  ['mega', art.mega], ['ram', art.megaRam], ['rackP', art.rackP], ['rackM', art.rackM], ['truck', art.truckDown], ['truckUp', art.truckUp],
  ['pillar', art.pillar], ['barrel', art.barrels[0]], ['boxes', art.boxes[0]], ['forklift', art.forklift], ['spare', art.spare[3]], ['bin0', art.bin[0]], ['clip', art.clip], ['worker', art.workers[0][1]],
];
let x = 20, y = 20, rowH = 0;
for (const [name, s] of items) {
  const w = (s.shadow.width / s.res) * Z;
  if (x + w > c.width - 20) { x = 20; y += rowH + 30; rowH = 0; }
  g.drawImage(s.shadow, x, y, (s.shadow.width / s.res) * Z, (s.shadow.height / s.res) * Z);
  g.drawImage(s.img, x, y, s.w * Z, s.h * Z);
  g.fillStyle = '#eee'; g.fillText(name, x, y - 4);
  x += w + 20; rowH = Math.max(rowH, (s.shadow.height / s.res) * Z);
}
// belts
for (let i = 0; i < 6; i++) g.drawImage(art.beltH.img, 0, 0, 64, 28, 20 + i * 32 * Z, y + rowH + 40, 32 * Z, 14 * Z);
(window as any).__ready = true;
