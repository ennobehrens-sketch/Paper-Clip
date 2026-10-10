// Binds the original page structure (index.html) to the game state.
// Text formats and show/hide/disable rules follow the original's updateStats() and buttonUpdate().

import { formatWithCommas } from '../game/format';
import type { Project, Stage1 } from '../game/stage1';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

export class Panels {
  private text = new Map<string, string>();
  private projectButtons = new Map<string, HTMLButtonElement>();
  private stockRowEls: HTMLTableCellElement[][] = [];
  private stockTimer = 0;
  private marginTouched = false;
  private megaTouched = false;
  private stratOptionsKey = '';
  private qChipEls: HTMLDivElement[] = [];

  constructor(private g: Stage1, hooks: { manualClip: () => void }) {
    const on = (id: string, fn: () => void) => $(id).addEventListener('click', fn);
    on('btnMakePaperclip', () => { if (g.wire >= 1) { g.clipClick(1); hooks.manualClip(); } });
    on('btnLowerPrice', () => { g.lowerPrice(); this.marginTouched = true; });
    on('btnRaisePrice', () => { g.raisePrice(); this.marginTouched = true; });
    on('btnExpandMarketing', () => g.buyAds());
    on('btnBuyWire', () => g.buyWire());
    on('btnToggleWireBuyer', () => g.toggleWireBuyer());
    on('btnMakeClipper', () => g.makeClipper());
    on('btnMakeMegaClipper', () => { g.makeMegaClipper(); this.megaTouched = true; });
    on('btnAddProc', () => g.addProc());
    on('btnAddMem', () => g.addMem());
    on('btnQcompute', () => g.qComp());
    on('btnInvest', () => g.investDeposit());
    on('btnWithdraw', () => g.investWithdraw());
    on('btnImproveInvestments', () => g.investUpgrade());
    on('btnRunTournament', () => { if (g.runTournamentEnabled) g.runTourney(); });
    on('btnNewTournament', () => { if (g.canStartTourney()) g.newTourney(); });
    on('btnToggleAutoTourney', () => g.toggleAutoTourney());
    $<HTMLSelectElement>('investStrat').addEventListener('change', (e) => { g.investStrat = (e.target as HTMLSelectElement).value; });
    $<HTMLSelectElement>('stratPicker').addEventListener('change', (e) => { g.stratPickerValue = (e.target as HTMLSelectElement).value; });
    const stuff = $('tournamentStuff');
    stuff.addEventListener('mouseenter', () => g.revealGrid());
    stuff.addEventListener('mouseleave', () => g.revealResults());
    $('projectListTop').addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest('button');
      if (b && !b.disabled) g.buyProject(b.dataset.id!);
    });
    // five stock rows, kept between updates like the original table
    const body = $('stockRows');
    for (let r = 0; r < 5; r++) {
      const tr = document.createElement('tr');
      const cells: HTMLTableCellElement[] = [];
      for (let c = 0; c < 5; c++) { const td = document.createElement('td'); td.innerHTML = '&nbsp;'; tr.appendChild(td); cells.push(td); }
      body.appendChild(tr);
      this.stockRowEls.push(cells);
    }
    for (let i = 0; i < 10; i++) {
      const d = document.createElement('div');
      d.className = 'qChip';
      $('qChips').appendChild(d);
      this.qChipEls.push(d);
    }
    $<HTMLSelectElement>('investStrat').value = g.investStrat;
  }

  private set(id: string, value: string): void {
    if (this.text.get(id) === value) return;
    this.text.set(id, value);
    $(id).textContent = value;
  }
  private show(id: string, on: boolean): void { $(id).hidden = !on; }
  private disable(id: string, off: boolean): void { $<HTMLButtonElement>(id).disabled = off; }

  /** A newly revealed project: the original appends a button and blinks it. */
  addProject(p: Project): void {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'proj blink';
    b.dataset.id = p.id;
    $('projectListTop').appendChild(b);
    this.projectButtons.set(p.id, b);
  }

  update(dt: number): void {
    const g = this.g;
    // console
    for (let i = 0; i < 5; i++) this.set('readout' + (i + 1), g.readout[i]);
    // counter and business
    this.set('clips', formatWithCommas(Math.ceil(g.clips), 0));
    this.set('funds', formatWithCommas(g.funds, 2));
    this.set('avgRev', formatWithCommas(g.avgRev, 2));
    this.set('avgSales', formatWithCommas(Math.round(g.avgSales)));
    this.set('unsoldClips', formatWithCommas(g.unsoldClips, 0));
    this.set('margin', this.marginTouched ? g.margin.toFixed(2) : '.25');
    this.set('demand', formatWithCommas(g.demand * 10, 0));
    this.set('marketingLvl', String(g.marketingLvl));
    this.set('adCost', formatWithCommas(g.adCost, 2));
    // manufacturing
    this.set('clipmakerRate', formatWithCommas(Math.round(g.clipRate)));
    this.set('wireBuyerStatus', g.wireBuyerStatus == 1 ? 'ON' : 'OFF');
    this.set('wire', formatWithCommas(g.wire));
    this.set('inchSpan', g.wire === 1 ? 'inch' : 'inches');
    this.set('wireCost', String(g.wireCost));
    this.set('clipmakerLevel2', String(g.clipmakerLevel));
    this.set('clipperCost', formatWithCommas(g.clipperCost, 2));
    this.set('megaClipperLevel', String(g.megaClipperLevel));
    this.set('megaClipperCost', this.megaTouched || g.megaClipperLevel > 0 ? formatWithCommas(g.megaClipperCost, 2) : '500');
    // computational resources
    this.set('trust', formatWithCommas(g.trust));
    this.set('nextTrust', formatWithCommas(Math.floor(g.nextTrust)));
    this.set('processors', String(g.processors));
    this.set('memory', String(g.memory));
    this.set('operations', formatWithCommas(g.operations));
    this.set('maxOps', formatWithCommas(g.memory * 1000));
    if (g.creativityOn) this.set('creativity', formatWithCommas(g.creativity));
    this.set('qCompDisplay', g.qCompDisplay);
    $('qCompDisplay').style.opacity = String(Math.max(0, g.qFade));
    for (let i = 0; i < 10; i++) this.qChipEls[i].style.opacity = String(Math.max(0, g.qChips[i].value));

    // visibility (buttonUpdate)
    const human = g.humanFlag == 1;
    this.show('businessDiv', human);
    this.show('manufacturingDiv', human);
    this.show('trustDiv', human);
    this.show('revPerSecDiv', g.revPerSecFlag === 1);
    this.show('compDiv', g.compFlag === 1);
    this.show('creativityDiv', !!g.creativityOn);
    this.show('projectsDiv', g.projectsFlag === 1);
    this.show('autoClipperDiv', g.autoClipperFlag !== 0);
    this.show('megaClipperDiv', g.megaClipperFlag !== 0);
    this.show('wireBuyerDiv', g.wireBuyerFlag == 1);
    this.show('investmentEngine', g.investmentEngineFlag == 1);
    this.show('investmentEngineUpgrade', g.investmentEngineFlag == 1);
    this.show('strategyEngine', g.strategyEngineFlag == 1);
    this.show('tournamentManagement', g.strategyEngineFlag == 1);
    this.show('qComputing', g.qFlag === 1);
    this.show('autoTourneyControl', g.autoTourneyFlag == 1);
    this.show('rightColumn', g.investmentEngineFlag == 1 || g.strategyEngineFlag == 1);

    // enabled states
    this.disable('btnMakePaperclip', g.wire < 1);
    this.disable('btnBuyWire', g.funds < g.wireCost);
    this.disable('btnMakeClipper', g.funds < g.clipperCost);
    this.disable('btnMakeMegaClipper', g.funds < g.megaClipperCost);
    this.disable('btnExpandMarketing', g.funds < g.adCost);
    this.disable('btnLowerPrice', g.margin <= 0.01);
    this.disable('btnAddProc', !g.canAddProcOrMem());
    this.disable('btnAddMem', !g.canAddProcOrMem());
    this.disable('btnNewTournament', !g.canStartTourney());
    this.disable('btnImproveInvestments', g.yomi < g.investUpgradeCost);
    this.disable('btnRunTournament', !g.runTournamentEnabled);

    // projects
    for (const [id, b] of this.projectButtons) {
      const p = g.activeProjects.find((x) => x.id === id);
      if (!p) { b.remove(); this.projectButtons.delete(id); continue; }
      const html = `<b>${esc(p.title)}${esc(p.priceTag)}</b><br>${esc(p.description)}`;
      if (b.dataset.html !== html) { b.dataset.html = html; b.innerHTML = html; }
      b.disabled = !p.cost();
    }
    for (const p of g.activeProjects) if (!this.projectButtons.has(p.id)) this.addProject(p);

    // investments
    this.set('investmentBankroll', formatWithCommas(g.bankroll));
    this.set('secValue', formatWithCommas(g.secTotal));
    this.set('portValue', formatWithCommas(g.portTotal));
    this.set('investmentLevel', String(g.investLevel));
    this.set('investUpgradeCost', formatWithCommas(g.investUpgradeCost));
    this.stockTimer += dt;
    if (this.stockTimer >= 0.1) {
      this.stockTimer = 0;
      // Same row logic as the original, including the row it forgets to clear after a sale.
      const n = g.stocks.length;
      for (let i = 0; i < n && i < 5; i++) {
        const s = g.stocks[i];
        const vals = [s.symbol, String(Math.ceil(s.amount)), String(Math.ceil(s.price)), String(Math.ceil(s.total)), String(Math.ceil(s.profit))];
        vals.forEach((v, c) => { if (this.stockRowEls[i][c].textContent !== v) this.stockRowEls[i][c].textContent = v; });
      }
      for (let i = n + 1; i < 5; i++) for (const td of this.stockRowEls[i]) if (td.textContent !== ' ') td.innerHTML = '&nbsp;';
    }

    // strategic modeling
    const key = g.stratOptions.map((o) => o.value).join(',');
    if (key !== this.stratOptionsKey) {
      this.stratOptionsKey = key;
      const sel = $<HTMLSelectElement>('stratPicker');
      sel.innerHTML = g.stratOptions.map((o) => `<option value="${o.value}">${esc(o.name)}</option>`).join('');
      sel.value = g.stratPickerValue;
    }
    this.set('tourneyDisplay', g.tourneyDisplay);
    this.set('vertStrat', g.vertStrat);
    this.set('horizStrat', g.horizStrat);
    this.set('vLabela', g.moveLabelA);
    this.set('vLabelb', g.moveLabelB);
    this.set('hLabela', g.moveLabelA);
    this.set('hLabelb', g.moveLabelB);
    const pg = g.payoffGrid;
    this.set('payoffCellAA', `${pg.valueAA},${pg.valueAA}`);
    this.set('payoffCellAB', `${pg.valueAB},${pg.valueBA}`);
    this.set('payoffCellBA', `${pg.valueBA},${pg.valueAB}`);
    this.set('payoffCellBB', `${pg.valueBB},${pg.valueBB}`);
    for (const c of ['AA', 'AB', 'BA', 'BB']) $('payoffCell' + c).classList.toggle('hit', g.highlightedCell === c);
    this.show('tournamentTable', g.tournamentTableVisible);
    this.show('tournamentResultsTable', g.tournamentResultsVisible);
    const picked = (g.pick as number) < 10 ? g.strats[g.pick as number]?.name : undefined;
    const res = g.results.map((s, i) => `<li${s.name === picked ? ' class="picked"' : ''}>${i + 1}. ${esc(s.name)}: ${s.currentScore}</li>`).join('');
    if ($('tourneyResults').dataset.html !== res) { $('tourneyResults').dataset.html = res; $('tourneyResults').innerHTML = res; }
    this.set('yomiDisplay', formatWithCommas(g.yomi));
    this.set('autoTourneyStatus', g.autoTourneyStatus == 1 ? 'ON' : 'OFF');
    this.set('newTourneyCost', g.tourneyCost.toLocaleString());
  }
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
