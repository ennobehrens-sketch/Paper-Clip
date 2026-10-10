// Test harness: runs the original game (from .original/, fetched locally) and our port
// side by side under the same random numbers and the same scripted player.
import { existsSync, readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { Scheduler } from '../src/game/scheduler';
import { Stage1 } from '../src/game/stage1';

export const ORIGINAL_DIR = '.original';
export const hasOriginal = () => existsSync(`${ORIGINAL_DIR}/main.js`);

/** Small seeded PRNG (mulberry32) that also counts calls. */
export function makeRng(seed: number) {
  let s = seed >>> 0;
  const rng = () => {
    rng.calls++;
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  rng.calls = 0;
  return rng;
}

/** Common interface over both implementations, used by the scripted player. */
export interface Side {
  sched: Scheduler;
  get(name: string): any;
  set(name: string, value: any): void;
  activeProjectIds(): string[];
  projectCost(id: string): boolean;
  buyProject(id: string): void;
  act(name: 'clipClick' | 'makeClipper' | 'makeMegaClipper' | 'buyWire' | 'buyAds' | 'raisePrice' | 'lowerPrice' | 'addProc' | 'addMem' | 'newTourney' | 'runTourney' | 'investDeposit' | 'investWithdraw' | 'investUpgrade' | 'qComp' | 'toggleWireBuyer'): void;
  setStratPick(value: string): void;
  setInvestStrat(value: string): void;
  messages(): string[];
}

export function loadOriginal(rng: () => number): Side {
  // Loading draws random numbers for the Stage 3 battle screen; give those a throwaway generator.
  const loadRng = makeRng(999);
  const html = readFileSync(`${ORIGINAL_DIR}/index2.html`, 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://example.org/' });
  const w = dom.window as any;
  const sched = new Scheduler();
  // combat.js animates the Stage 3 battle screen every 16ms and draws random numbers for it;
  // that timer is irrelevant to Stage 1, so it is not run.
  w.setInterval = (fn: () => void, ms: number) => (ms === 16 ? -1 : sched.setInterval(fn, ms));
  w.setTimeout = (fn: () => void, ms: number) => sched.setTimeout(fn, ms);
  w.clearInterval = (id: number) => sched.clear(id);
  w.clearTimeout = (id: number) => sched.clear(id);
  w.Audio = class { addEventListener() {} play() {} };
  w.HTMLCanvasElement.prototype.getContext = () => new Proxy({}, { get: () => () => ({}) });
  // Speed: store innerHTML as plain text instead of parsing it (the game only writes text into it).
  Object.defineProperty(w.Element.prototype, 'innerHTML', {
    configurable: true,
    get() { return this.__html ?? this.textContent; },
    set(v) { this.__html = String(v); },
  });
  Object.defineProperty(w.HTMLElement.prototype, 'style', {
    configurable: true,
    get() { return (this.__style ??= new Proxy({} as Record<string, string>, { get: (t, k) => (typeof k === 'string' ? t[k] ?? '' : undefined) })); },
  });
  Object.defineProperty(w.HTMLButtonElement.prototype, 'disabled', {
    configurable: true,
    get() { return !!this.__disabled; },
    set(v) { this.__disabled = !!v; },
  });
  w.eval('Math.random = function(){ return __rng(); }');
  w.__rng = loadRng;
  for (const f of ['combat.js', 'globals.js', 'projects.js', 'main.js']) w.eval(readFileSync(`${ORIGINAL_DIR}/${f}`, 'utf8'));
  w.__rng = rng;
  const doc = w.document as Document;
  return {
    sched,
    get: (n) => w.eval(n),
    set: (n, v) => { w.__v = v; w.eval(`${n} = __v`); },
    activeProjectIds: () => (w.eval('activeProjects') as any[]).map((p) => String(p.id).replace('projectButton', '')),
    projectCost: (id) => w.eval(`project${id}.cost()`),
    buyProject: (id) => w.eval(`project${id}.effect()`),
    act: (name) => w.eval(name === 'clipClick' ? 'clipClick(1)' : `${name}()`),
    setStratPick: (v) => { (doc.getElementById('stratPicker') as HTMLSelectElement).value = v; },
    setInvestStrat: (v) => { (doc.getElementById('investStrat') as HTMLSelectElement).value = v; },
    messages: () => [1, 2, 3, 4, 5].map((i) => doc.getElementById('readout' + i)!.innerHTML),
  };
}

export function loadPort(rng: () => number): Side & { game: Stage1 } {
  const sched = new Scheduler();
  const game = new Stage1(rng, sched);
  return {
    game,
    sched,
    get: (n) => (game as any)[n],
    set: (n, v) => { (game as any)[n] = v; },
    activeProjectIds: () => game.activeProjects.map((p) => p.id),
    projectCost: (id) => game.p['project' + id].cost(),
    buyProject: (id) => { game.buyProject(id); },
    act: (name) => (name === 'clipClick' ? game.clipClick(1) : (game as any)[name]()),
    setStratPick: (v) => { game.stratPickerValue = v; },
    setInvestStrat: (v) => { game.investStrat = v; },
    messages: () => game.readout.slice(),
  };
}

/** Values compared between the two implementations. */
export const COMPARED = [
  'clips', 'unusedClips', 'unsoldClips', 'funds', 'margin', 'wire', 'wireCost', 'wireBasePrice', 'wireSupply', 'wirePurchase',
  'adCost', 'demand', 'clipsSold', 'income', 'avgRev', 'avgSales', 'marketingLvl', 'marketingEffectiveness', 'demandBoost',
  'clipmakerLevel', 'clipperCost', 'clipperBoost', 'boostLvl', 'megaClipperLevel', 'megaClipperCost', 'megaClipperBoost', 'clipRate',
  'processors', 'memory', 'operations', 'standardOps', 'tempOps', 'trust', 'nextTrust', 'creativity', 'creativityOn', 'creativitySpeed',
  'milestoneFlag', 'compFlag', 'projectsFlag', 'revPerSecFlag', 'autoClipperFlag', 'megaClipperFlag', 'wireBuyerFlag',
  'strategyEngineFlag', 'investmentEngineFlag', 'qFlag', 'qClock', 'nextQchip', 'qChipCost',
  'bankroll', 'secTotal', 'portTotal', 'portfolioSize', 'stockID', 'ledger', 'riskiness', 'investLevel', 'investUpgradeCost', 'stockGainThreshold',
  'yomi', 'yomiBoost', 'tourneyCost', 'tourneyInProg', 'currentRound', 'rounds', 'resultsFlag', 'aa', 'ab', 'ba', 'bb', 'humanFlag', 'ticks',
] as const;
