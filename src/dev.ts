// Development snapshots (?dev=early|floor|mega|huge) for checking the art at different scales.
// They overwrite state directly and are never saved.
import type { Stage1 } from './game/stage1';

export function applyDevSnapshot(g: Stage1, name: string): void {
  const s: Partial<Record<keyof Stage1, unknown>> = {
    early: { clips: 1240, funds: 3.91, wire: 612, unsoldClips: 58, clipmakerLevel: 3, autoClipperFlag: 1, milestoneFlag: 3, clipsSold: 1100 },
    floor: { clips: 48900, funds: 41.2, wire: 2104, unsoldClips: 820, margin: 0.06, marketingLvl: 5, adCost: 1600, clipmakerLevel: 40, autoClipperFlag: 1,
      clipperBoost: 1.25, boostLvl: 1, trust: 8, nextTrust: 55000, fib1: 21, fib2: 34, processors: 3, memory: 4, standardOps: 2310, compFlag: 1, projectsFlag: 1,
      revPerSecFlag: 1, milestoneFlag: 4, clipsSold: 48000 },
    mega: { clips: 1920000, funds: 5210, wire: 31400, unsoldClips: 184000, margin: 0.25, marketingLvl: 9, adCost: 25600, marketingEffectiveness: 3, clipmakerLevel: 110,
      megaClipperLevel: 6, clipperBoost: 2.5, boostLvl: 3, wireSupply: 5250, wireBuyerFlag: 1, trust: 19, nextTrust: 2584000, fib1: 1597, fib2: 2584,
      processors: 6, memory: 12, standardOps: 9420, creativity: 212, creativityOn: true, compFlag: 1, projectsFlag: 1, revPerSecFlag: 1, megaClipperFlag: 1,
      investmentEngineFlag: 1, strategyEngineFlag: 1, autoClipperFlag: 1, milestoneFlag: 6, clipsSold: 1700000, qFlag: 1 },
    huge: { clips: 90000000, funds: 250000, wire: 400000, unsoldClips: 900000, marketingLvl: 14, adCost: 819200, marketingEffectiveness: 15, clipmakerLevel: 260,
      megaClipperLevel: 30, clipperBoost: 7.5, wireSupply: 15750, wireBuyerFlag: 1, trust: 60, nextTrust: 102334000, processors: 22, memory: 30, standardOps: 30000,
      creativityOn: true, compFlag: 1, projectsFlag: 1, revPerSecFlag: 1, megaClipperFlag: 1, investmentEngineFlag: 1, strategyEngineFlag: 1, autoClipperFlag: 1,
      milestoneFlag: 6, clipsSold: 89000000, qFlag: 1 },
  }[name] as any;
  if (!s) return;
  Object.assign(g, s);
  g.clipperCost = Math.pow(1.1, g.clipmakerLevel) + 5;
  g.megaClipperCost = Math.pow(1.07, g.megaClipperLevel) * 1000;
  g.displayMessage('(Development snapshot: ' + name + ')');
}
