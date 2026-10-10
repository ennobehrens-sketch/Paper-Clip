// Where everything sits on the factory floor. Positions are world pixels (= sprite pixels).
// Machines are placed in a fixed order, so buying one more never moves the others.

export const BENCH = { x: 0, y: 0 };
export const SPOOL = { x: -80, y: 0 };
export const BIN = { x: 110, y: 0 };
export const SPARE = { x: -138, y: 0 };
/** The assembly area around the bench; machines never go here. */
export const CORE = { x0: -165, x1: 86, y0: -34, y1: 34 };
/** The server room, cleared out when Computational Resources unlocks. */
export const COMPUTE = { x0: -372, x1: -170, y0: -72, y1: 72, right: -192, rowsP: [-48, -16], rowsM: [18, 50], dx: 24 };
/** Collector conveyor (x = TRUNK_X) and the delivery road. */
export const TRUNK_X = 110;
export const ROAD = { x0: 132, x1: 198, laneDown: 152, laneUp: 178, top: -44 };
export const AISLE = { x0: 86, x1: 212 };
export const FORKLIFT = { x: 166, y: -84 };
/** MegaClippers go in a hall on the far side of the road. */
export const MEGA_HALL = { x0: 236, y0: -150, y1: 150 };
export const MEGA_BIN = { x: 232, y: 0 };

/** Auto rows sit above and below the assembly band: y = ±(60 + 56k). */
export const AUTO_ROW = { first: 60, step: 56, colStep: 40 };
const AUTO_HALF = { w: 19, top: 21, bottom: 34 }; // sprite plus its belt below

const overlaps = (x0: number, y0: number, x1: number, y1: number, r: { x0: number; y0: number; x1: number; y1: number }) =>
  x1 > r.x0 && x0 < r.x1 && y1 > r.y0 && y0 < r.y1;

/** Grid cells for AutoClippers, nearest to the bench first. */
export const AUTO_CELLS: [number, number][] = (() => {
  const out: [number, number, number][] = [];
  for (let k = 0; k < 16; k++) {
    for (const sign of [-1, 1]) {
      // the upper rows sit a little higher so their belts clear the assembly area
      const y = sign * (AUTO_ROW.first + (sign < 0 ? 8 : 0) + k * AUTO_ROW.step);
      for (let cx = -40; cx <= 2; cx++) {
        const x = cx * AUTO_ROW.colStep;
        const x0 = x - AUTO_HALF.w, x1 = x + AUTO_HALF.w, y0 = y - AUTO_HALF.top, y1 = y + AUTO_HALF.bottom;
        if (overlaps(x0, y0, x1, y1, CORE)) continue;
        // rows level with the server room only extend to its right, so belts never cross it
        if (y1 > COMPUTE.y0 - 6 && y0 < COMPUTE.y1 + 6 && x0 < COMPUTE.x1 + 6) continue;
        if (x1 > AISLE.x0 - 10) continue;
        out.push([x, y, ((x + 20) / 2.2) ** 2 + y * y + (sign > 0 ? 1 : 0)]);
      }
    }
  }
  return out.sort((a, b) => a[2] - b[2]).map(([x, y]) => [x, y]);
})();

/** MegaClipper positions: three rows, columns going outwards from the road. */
export const MEGA_CELLS: [number, number][] = (() => {
  const out: [number, number][] = [];
  for (let c = 0; c < 40; c++) for (const y of [-92, 0, 92]) out.push([MEGA_HALL.x0 + 52 + c * 92, y]);
  return out;
})();

function rackPos(i: number, count: number, rows: number[]): [number, number] {
  const perRow = Math.max(8, Math.ceil(count / 2));
  const row = Math.floor(i / perRow) % 2;
  const col = i % perRow;
  return [COMPUTE.right - col * COMPUTE.dx, rows[row]];
}
export const processorPos = (i: number, count: number) => rackPos(i, count, COMPUTE.rowsP);
export const memoryPos = (i: number, count: number) => rackPos(i, count, COMPUTE.rowsM);

export interface Bounds { x0: number; y0: number; x1: number; y1: number }

/** Structural columns on a fixed grid, skipped where something stands. */
export function pillarSpots(view: Bounds, blocked: (x: number, y: number) => boolean): [number, number][] {
  const out: [number, number][] = [];
  const GX = 320, GY = 280, OX = -200, OY = 140;
  for (let gx = Math.floor((view.x0 - OX) / GX); gx <= Math.ceil((view.x1 - OX) / GX); gx++) {
    for (let gy = Math.floor((view.y0 - OY) / GY); gy <= Math.ceil((view.y1 - OY) / GY); gy++) {
      const x = OX + gx * GX, y = OY + gy * GY;
      if (!blocked(x, y)) out.push([x, y]);
    }
  }
  return out;
}
