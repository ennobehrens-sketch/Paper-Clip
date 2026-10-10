# Paperclip Foundry — specification

A browser remake of Universal Paperclips (Frank Lantz, 2017) with a graphical factory view.
The game rules are a faithful port of the original; the graphics are new.

## Decisions so far

| Topic | Decision |
|---|---|
| Platform | Browser, TypeScript + Vite, no framework |
| Art direction | "Foundry": a top-down human factory floor in the spirit of late-90s 2D RTS games. Riveted steel, hazard paint, amber work lights, detailed shaded sprites |
| Camera | Top-down. Frames everything the player owns and zooms out in steps as the operation grows |
| Rules | 100% faithful to the original, down to every number, random draw and message |
| Panels | Same structure, labels, order and reveal conditions as the original page |
| First milestone | Stage 1 complete and playable, ending at "Release the HypnoDrones" |

## Architecture

```
src/game/       the rules, no DOM
  scheduler.ts  virtual clock that runs the original's timers deterministically
  stage1.ts     port of main.js / projects.js / globals.js for Stage 1
  format.ts     the original's number and time formatting
  save.ts       save/load to localStorage
src/ui/         the original's console, counter and three panel columns
src/render/     the factory view: sprites, camera, lighting, effects
tests/          unit tests and the differential test against the original
```

The game state lives only in `Stage1`. The UI and the renderer read it; they never decide anything.

### Timers

The original is driven by browser timers. The port keeps them, on a virtual clock, registered in the
original order:

| Period | What runs |
|---|---|
| 10 ms | main loop: milestones, operations, trust, quantum chips, projects, clip-rate tracker, WireBuyer, AutoClippers and MegaClippers, demand, creativity |
| 100 ms | slow loop: wire price drift, sales roll, revenue average (every 10th run), autosave (every 250th) |
| 100 ms | investment totals and risk level |
| 1 s | investment engine buys a stock (25% chance when the budget allows) |
| 2.5 s | investment engine sells (30% chance after 5 periods) and reprices stocks |
| 100 ms | strategy picker value is copied into `pick` |
| 50 ms timeouts | tournament rounds: 10 moves per pairing, 100 ms per move |

### Fidelity check

`tests/differential.test.ts` loads the original game in jsdom and runs it next to the port with the
same seeded random numbers and the same scripted player. After every 5 seconds of game time it compares
about 80 state values, the active project list, the console and the number of random draws. Four runs
together complete every Stage 1 project, run tournaments with all eight strategies, use the investment
engine at all risk levels, run out of wire and beg for more, and finish with Release the HypnoDrones.

The original source is not part of this repository. `npm run fetch-original` downloads it into
`.original/` (git-ignored) for the test.

## Stage 1 rules (summary)

The code in `src/game/stage1.ts` is the reference; this is an overview.

- **Making clips.** Each clip uses 1 inch of wire. AutoClippers make `clipperBoost` clips per second each,
  MegaClippers `500 × megaClipperBoost`.
- **Costs.** AutoClipper `1.1^level + 5`. MegaClipper `1.07^level × 1000` (first one $500). Marketing
  starts at $100 and doubles. A wire spool costs `ceil(base + 6·sin(n))`; the base rises $0.05 per purchase,
  falls 0.1% every 25 s without a purchase, and is re-rolled with 1.5% chance every 100 ms.
- **Demand and sales.** `demand = 0.8 / price × 1.1^(marketing level − 1) × effectiveness × boosts`,
  shown ×10 as a percentage. Every 100 ms, with probability `demand / 100`, customers buy
  `floor(0.7 × demand^1.15)` clips.
- **Trust.** +1 at 3,000 clips, then at Fibonacci multiples of 1,000 (5k, 8k, 13k, ...), plus project rewards.
  Each processor or memory costs one unused trust.
- **Operations.** Processors add `processors / 10` ops per 10 ms up to `memory × 1,000`. Creativity grows
  while ops are full, at a rate set by processors.
- **Panels appear** when the original shows them: AutoClippers at $5; Computational Resources and
  Projects at 2,000 clips (or when out of wire, money and stock); revenue lines after RevTracker;
  WireBuyer, MegaClippers, Investments, Strategic Modeling and Quantum Computing after their projects.
- **Projects.** All 51 Stage 1 projects, with original triggers, costs, effects, messages and order.
- **End of Stage 1.** Release the HypnoDrones (100 trust). Stage 2 is the next milestone.

## Art

All art is generated in code at startup (`src/render/assets.ts`), so there are no image files.
Each sprite is modelled as a small height field with materials (painted steel with chipped edges,
chrome, copper, rubber, wood, glass, cast iron). `src/render/sprite.ts` then renders it like a
pre-rendered 3D sprite: lighting from the top left, ambient occlusion, self-shadowing, specular
highlights, a dark outline and a soft drop shadow. Sprites are generated at 2 texels per world pixel.

Moving parts are separate small sprites animated by the renderer: the AutoClipper bender arm, the
MegaClipper ram (its shadow shrinks as it comes down), the arbor press lever, and the wire drum's turning marks.

On top of the sprites the renderer adds a light map (ceiling lamps, a task light on the bench,
truck headlights), additive glows (rack LEDs, machine displays, MegaClipper beacons, sparks)
and a vignette. Workers in hard hats walk their rounds while humans still run the business.

Development snapshots for checking the art at each scale: `?dev=early`, `?dev=floor`, `?dev=mega`,
`?dev=huge`. `/gallery.html` shows every sprite enlarged.

## Camera plan

The camera frames everything the player owns plus a margin and eases between zoom steps. Steps above
1× are whole numbers or halves so the art stays sharp.

| Scale | View | Driven by |
|---|---|---|
| 3× | One workbench with an arbor press, a wire drum, a clip bin | start |
| 2× | First AutoClippers beside the bench, conveyors to the bin, trucks | AutoClipper count, first sales |
| 1.5× → 0.9× | AutoClipper rows, the storeroom becomes a server room | AutoClippers, Computational Resources |
| 0.9× → 0.4× | Full factory floor, MegaClipper hall across the road | AutoClippers ≥ 75, MegaClipper count |
| Stage 2 | Factory → city → continent → Earth | factories, drones, matter |
| Stage 3 | Earth → solar system → galaxy | probes, % explored |
