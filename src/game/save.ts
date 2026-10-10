// Saving and loading the Stage 1 state to localStorage.

import type { Stage1 } from './stage1';

const KEY = 'paperclip-foundry-save-v1';

// Fields that are not plain data, or are rebuilt on load.
const SKIP = new Set(['sched', 'rng', 'onMessage', 'onProjectShown', 'onStageEnd', 'onAutoSave', 'projects', 'activeProjects', 'p',
  'allStrats', 'strats', 'results', 'hStrat', 'vStrat', 'stratOptions', 'qChips', 'stocks', 'payoffGrid']);

export function serialize(g: Stage1): string {
  const data: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(g)) {
    if (SKIP.has(k) || typeof v === 'function') continue;
    data[k] = v;
  }
  data.projects = g.projects.map((p) => ({ id: p.id, uses: p.uses, flag: p.flag, priceTag: p.priceTag }));
  data.activeProjects = g.activeProjects.map((p) => p.id);
  data.strats = g.strats.map((s) => s.name);
  data.allStratsActive = g.allStrats.map((s) => s.active);
  data.stratOptions = g.stratOptions;
  data.qChips = g.qChips.map((c) => c.active);
  data.stocks = g.stocks;
  data.payoffGrid = g.payoffGrid;
  return JSON.stringify(data);
}

export function deserialize(g: Stage1, json: string): void {
  const data = JSON.parse(json) as Record<string, any>;
  for (const [k, v] of Object.entries(data)) {
    if (SKIP.has(k) || k === 'allStratsActive') continue;
    if (k in g) (g as any)[k] = v;
  }
  for (const s of data.projects ?? []) {
    const p = g.projects.find((x) => x.id === s.id);
    if (p) { p.uses = s.uses; p.flag = s.flag; p.priceTag = s.priceTag; }
  }
  g.activeProjects = (data.activeProjects ?? []).map((id: string) => g.projects.find((x) => x.id === id)).filter(Boolean);
  if (data.allStratsActive) g.allStrats.forEach((s, i) => (s.active = data.allStratsActive[i]));
  if (data.strats) g.strats = data.strats.map((n: string) => g.allStrats.find((s) => s.name === n)!).filter(Boolean);
  if (data.stratOptions) g.stratOptions = data.stratOptions;
  if (data.qChips) g.qChips.forEach((c, i) => (c.active = data.qChips[i] ?? 0));
  if (data.stocks) g.stocks = data.stocks;
  if (data.payoffGrid) g.payoffGrid = data.payoffGrid;
  g.hStrat = g.strats[0];
  g.vStrat = g.strats[0];
  // A tournament cannot be resumed mid-round; the original loses it on reload too.
  if (g.tourneyInProg) {
    g.tourneyInProg = 0;
    g.runTournamentEnabled = false;
  }
  g.incomeThen = data.incomeThen ?? undefined;
  g.incomeNow = data.incomeNow ?? undefined;
}

export function saveGame(g: Stage1): void {
  try { localStorage.setItem(KEY, serialize(g)); } catch { /* storage unavailable */ }
}

export function loadGame(g: Stage1): boolean {
  try {
    const s = localStorage.getItem(KEY);
    if (!s) return false;
    deserialize(g, s);
    return true;
  } catch {
    return false;
  }
}

export function clearSave(): void {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
