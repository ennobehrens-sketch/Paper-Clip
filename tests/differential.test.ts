// Differential test: the original game and our port, same seed, same scripted player.
// Every compared value must match exactly at every checkpoint, and both must draw the
// same number of random numbers. Skipped when the original source is not in .original/
// (run `npm run fetch-original` to get it).
import { describe, expect, it } from 'vitest';
import { COMPARED, hasOriginal, loadOriginal, loadPort, makeRng, type Side } from './harness';

/** A deterministic player. It only reads state, so both sides make the same moves if they agree. */
type Mode = 'plain' | 'cheats' | 'endgame' | 'nowire';

function play(side: Side, step: number, mode: Mode): void {
  const cheats = mode !== 'plain' && mode !== 'nowire';
  const g = (n: string) => side.get(n);
  // early game: hand-make clips
  if (g('wire') >= 1 && step % 2 === 0 && g('clipmakerLevel') < 30) side.act('clipClick');
  if (g('funds') >= g('clipperCost') && g('clipmakerLevel') < 120) side.act('makeClipper');
  if (mode === 'nowire') {
    // never buys wire and sells cheap, so it runs dry and has to beg
    if (g('margin') > 0.05) side.act('lowerPrice');
    for (const id of side.activeProjectIds()) if (side.projectCost(id)) { side.buyProject(id); break; }
    return;
  }
  if (g('wire') < 600 && g('funds') >= g('wireCost')) side.act('buyWire');
  if (g('funds') >= g('adCost') * 2) side.act('buyAds');
  if (g('megaClipperFlag') == 1 && g('funds') >= g('megaClipperCost') * 3) side.act('makeMegaClipper');
  // keep inventory in a band by moving the price
  if (step % 10 === 0) {
    const unsold = g('unsoldClips');
    if (unsold > 400 && g('margin') > 0.01) side.act('lowerPrice');
    else if (unsold < 40 && g('margin') < 0.4) side.act('raisePrice');
  }
  // trust: alternate processors and memory
  if (g('trust') > g('processors') + g('memory')) side.act(g('processors') <= g('memory') ? 'addProc' : 'addMem');
  // buy the first affordable project
  for (const id of side.activeProjectIds()) {
    if (id === '35' && !(mode === 'endgame' && step > 5500)) continue;
    if (id === '219' && !(mode === 'endgame' && step % 2000 === 1000)) continue;
    if (side.projectCost(id)) { side.buyProject(id); break; }
  }
  // strategic modeling: pick RANDOM (or the newest strategy) and run tournaments
  if (g('strategyEngineFlag') == 1) {
    side.setStratPick(step % 3000 < 1500 ? '0' : String(g('strats').length - 1));
    if (g('tourneyInProg') == 0 && g('operations') >= g('tourneyCost') && step % 50 === 0) {
      side.act('newTourney');
      side.act('runTourney');
    }
  }
  if (g('investmentEngineFlag') == 1) {
    if (step % 600 === 0) side.setInvestStrat(['low', 'med', 'hi'][(step / 600) % 3]);
    if (step % 400 === 100 && g('funds') > 500) side.act('investDeposit');
    if (step % 1700 === 900) side.act('investWithdraw');
    if (g('yomi') >= g('investUpgradeCost')) side.act('investUpgrade');
  }
  if (g('qFlag') == 1 && step % 7 === 0) side.act('qComp');
  // optional fast-forward so a short test reaches late Stage 1 content
  if (cheats && step % 500 === 250) {
    side.set('funds', g('funds') + 50000);
    side.set('standardOps', g('standardOps') + 20000);
    side.set('creativity', g('creativity') + 300);
    side.set('trust', g('trust') + 2);
    side.set('yomi', g('yomi') + 5000);
  }
  if (mode === 'endgame' && step % 500 === 260) {
    side.set('funds', g('funds') + 3000000);
    side.set('creativity', g('creativity') + 40000);
    side.set('trust', g('trust') + 6);
    side.set('clips', g('clips') + 20000000);
    if (step > 3000) {
      side.set('memory', Math.max(g('memory'), 90));
      side.set('standardOps', g('standardOps') + 60000);
    }
  }
}

function runBoth(seed: number, seconds: number, mode: Mode) {
  const r1 = makeRng(seed);
  const r2 = makeRng(seed);
  const orig = loadOriginal(r1);
  const port = loadPort(r2);
  const steps = seconds * 10; // the player acts every 100ms
  for (let step = 1; step <= steps; step++) {
    orig.sched.advanceBy(100);
    port.sched.advanceBy(100);
    if (orig.get('humanFlag') == 0) break; // Stage 2 starts; the port stops there
    play(orig, step, mode);
    play(port, step, mode);
    if (step % 50 === 0 || step === steps) {
      for (const k of COMPARED) {
        const a = orig.get(k);
        const b = port.get(k);
        if (!Object.is(a, b) && !(a === b)) {
          throw new Error(`step ${step} (${step / 10}s): ${k} original=${a} port=${b}`);
        }
      }
      expect(port.activeProjectIds()).toEqual(orig.activeProjectIds());
      expect(port.messages()).toEqual(orig.messages());
      expect(r2.calls).toBe(r1.calls);
    }
  }
  return { orig, port };
}

describe.skipIf(!hasOriginal())('matches the original game', () => {
  it('early game, no cheats (15 minutes of play)', () => {
    const { port } = runBoth(1234, 900, 'plain');
    expect(port.get('clipmakerLevel')).toBeGreaterThan(10);
    expect(port.get('compFlag')).toBe(1);
  }, 600_000);

  it('whole Stage 1 toolset with fast-forward (20 minutes of play)', () => {
    const { port } = runBoth(42, 1200, 'cheats');
    // reached the late Stage 1 systems
    expect(port.get('strategyEngineFlag')).toBe(1);
    expect(port.get('investmentEngineFlag')).toBe(1);
    expect(port.get('megaClipperFlag')).toBe(1);
    const game = (port as any).game;
    const bought = game.projects.filter((p: any) => p.flag == 1).map((p: any) => p.id);
    console.log('projects completed:', bought.join(' '), '| strategies:', game.strats.length, '| yomi:', game.yomi, '| qChips:', game.nextQchip);
  }, 900_000);

  it('running out of wire and begging for more', () => {
    const { port } = runBoth(7, 600, 'nowire');
    expect(port.get('compFlag')).toBe(1);
    expect((port as any).game.p.project2.flag).toBe(1);
  }, 600_000);

  it('late Stage 1 through Release the HypnoDrones', () => {
    const { port } = runBoth(99, 900, 'endgame');
    const game = (port as any).game;
    const bought = game.projects.filter((p: any) => p.flag == 1).map((p: any) => p.id);
    console.log('endgame projects completed:', bought.join(' '));
    expect(port.get('humanFlag')).toBe(0);
  }, 900_000);
});
