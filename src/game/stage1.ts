// Stage 1 of Universal Paperclips, ported from the original main.js / projects.js / globals.js.
//
// Ground rules for this file:
// - Variable and function names match the original, so the two can be compared side by side.
// - Arithmetic is written in the same order as the original, so results match bit for bit.
// - Random numbers are drawn in the same order as the original (tests/differential.test.ts checks this).
// - Anything the original did only to the DOM is left to the UI, which reads this state.

import { Scheduler } from './scheduler';
import { formatWithCommas, timeCruncher } from './format';

export type Rng = () => number;

export interface Project {
  id: string;
  title: string;
  priceTag: string;
  description: string;
  trigger: () => boolean;
  uses: number;
  cost: () => boolean;
  flag: number;
  effect: () => void;
}

export interface Strat {
  name: string;
  active: number;
  currentScore: number;
  currentPos: number;
  pickMove: () => number;
}

export interface Stock {
  id: number;
  symbol: string;
  price: number;
  amount: number;
  total: number;
  profit: number;
  age: number;
}

export type PayoffCell = 'AA' | 'AB' | 'BA' | 'BB' | null;

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const CHOICE_A = ['cooperate', 'swerve', 'macro', 'fight', 'bet', 'raise_price', 'opera', 'go', 'heads', 'particle', 'discrete', 'peace', 'search', 'lead', 'accept', 'accept', 'attack'];
const CHOICE_B = ['defect', 'straight', 'micro', 'back_down', 'fold', 'lower_price', 'football', 'stay', 'tails', 'wave', 'continuous', 'war', 'evaluate', 'follow', 'reject', 'deny', 'decay'];

export class Stage1 {
  readonly sched: Scheduler;
  rng: Rng;

  // UI hooks
  onMessage: (msg: string) => void = () => {};
  onProjectShown: (p: Project) => void = () => {};
  onStageEnd: () => void = () => {};

  /** The console: readout[0] is the newest line (readout1 in the original). */
  readout: string[] = ['Welcome to Universal Paperclips', '', '', '', ''];

  // ---- globals.js (Stage 1 subset) ----
  clips = 0;
  unusedClips = 0;
  clipRate = 0;
  clipRateTemp = 0;
  prevClips = 0;
  clipRateTracker = 0;
  clipmakerLevel = 0;
  clipperCost = 5;
  unsoldClips = 0;
  funds = 0;
  margin = 0.25;
  wire = 1000;
  wireCost = 20;
  adCost = 100;
  demand = 5;
  clipsSold = 0;
  avgRev = 0;
  income = 0;
  incomeTracker: number[] = [0];
  ticks = 0;
  marketing = 1;
  marketingLvl = 1;
  processors = 1;
  memory = 1;
  operations = 0;
  trust = 2;
  nextTrust = 3000;
  transaction = 1;
  clipperBoost = 1;
  creativity = 0;
  creativityOn = false;
  boostLvl = 0;
  wirePurchase = 0;
  wireSupply = 1000;
  marketingEffectiveness = 1;
  milestoneFlag = 0;
  bankroll = 0;
  fib1 = 2;
  fib2 = 3;
  strategyEngineFlag = 0;
  investmentEngineFlag = 0;
  revPerSecFlag = 0;
  compFlag = 0;
  projectsFlag = 0;
  autoClipperFlag = 0;
  megaClipperFlag = 0;
  megaClipperCost = 500;
  megaClipperLevel = 0;
  megaClipperBoost = 1;
  creativitySpeed = 1;
  creativityCounter = 0;
  wireBuyerFlag = 0;
  demandBoost = 1;
  humanFlag = 1;
  qFlag = 0;
  qClock = 0;
  qChipCost = 10000;
  nextQchip = 0;
  bribe = 1000000;
  prestigeU = 0;
  prestigeS = 0;
  autoTourneyFlag = 0;
  wirePriceCounter = 0;
  wireBasePrice = 20;
  swarmGifts = 0;
  wireBuyerStatus = 1;
  wirePriceTimer = 0;
  qFade = 1;
  autoTourneyStatus = 1;
  tempOps = 0;
  standardOps = 0;
  opFade = 0;
  opFadeTimer = 0;
  opFadeDelay = 800;
  dismantle = 0;

  // ---- revenue tracker (main.js) ----
  incomeThen: number | undefined = undefined;
  incomeNow: number | undefined = undefined;
  trueAvgRev = 0;
  avgSales = 0;
  incomeLastSecond = 0;
  saveTimer = 0;
  secTimer = 0;

  // ---- quantum computing ----
  qChips = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1].map((waveSeed) => ({ waveSeed, value: 0, active: 0 }));
  qCompDisplay = ' ';

  // ---- investments ----
  stocks: Stock[] = [];
  portfolioSize = 0;
  stockID = 0;
  secTotal = 0;
  portTotal = 0;
  sellDelay = 0;
  riskiness = 5;
  maxPort = 5;
  investLevel = 0;
  investUpgradeCost = 100;
  stockGainThreshold = 0.5;
  ledger = 0;
  stockReportCounter = 0;
  /** Value of the risk <select>: 'low' | 'med' | 'hi'. The original's default selection is Low Risk. */
  investStrat = 'low';

  // ---- strategic modeling ----
  tourneyCost = 1000;
  tourneyLvl = 1;
  stratCounter = 0;
  hMove = 1;
  vMove = 1;
  hMovePrev = 1;
  vMovePrev = 1;
  aa = 0;
  ab = 0;
  ba = 0;
  bb = 0;
  rounds = 0;
  currentRound = 0;
  rCounter = 0;
  tourneyInProg = 0;
  winnerPtr = 0;
  placeScore = 0;
  showScore = 0;
  high = 0;
  /** Strategy picked in the <select>; copied into `pick` every 100ms like the original. */
  stratPickerValue = '10';
  pick: string | number = 10;
  yomi = 0;
  yomiBoost = 1;
  allStrats: Strat[] = [];
  strats: Strat[] = [];
  resultsTimer = 0;
  results: Strat[] = [];
  resultsFlag = 0;
  payoffGrid = { valueAA: 0, valueAB: 0, valueBA: 0, valueBB: 0 };
  h = 0;
  v = 0;
  hStrat!: Strat;
  vStrat!: Strat;
  // display state the original kept in the DOM, needed by the rules or the UI
  runTournamentEnabled = false;
  tournamentTableVisible = true;
  tournamentResultsVisible = true;
  tourneyDisplay = 'Pick strategy, run tournament, gain yomi';
  vertStrat = ' ';
  horizStrat = ' ';
  moveLabelA = 'Move A';
  moveLabelB = 'Move B';
  highlightedCell: PayoffCell = null;
  stratOptions: { name: string; value: string }[] = [{ name: 'Pick a Strat', value: '10' }, { name: 'RANDOM', value: '0' }];

  // ---- projects ----
  projects: Project[] = [];
  activeProjects: Project[] = [];
  p: Record<string, Project> = {};

  constructor(rng: Rng = Math.random, sched: Scheduler = new Scheduler()) {
    this.rng = rng;
    this.sched = sched;
    this.initStrats();
    this.initProjects();
    // Timers, registered in the same order as the original script.
    sched.setInterval(() => this.stockDisplayLoop(), 100);
    sched.setInterval(() => { if (this.humanFlag == 1) this.stockShop(); }, 1000);
    sched.setInterval(() => this.stockTradeLoop(), 2500);
    sched.setInterval(() => { this.pick = this.stratPickerValue; }, 100);
    sched.setInterval(() => this.mainLoop(), 10);
    sched.setInterval(() => this.slowLoop(), 100);
  }

  // ------------------------------------------------------------------ messages

  displayMessage(msg: string): void {
    this.readout.pop();
    this.readout.unshift(msg);
    this.onMessage(msg);
  }

  // ------------------------------------------------------------------ wire

  adjustWirePrice(): void {
    this.wirePriceTimer++;
    if (this.wirePriceTimer > 250 && this.wireBasePrice > 15) {
      this.wireBasePrice = this.wireBasePrice - this.wireBasePrice / 1000;
      this.wirePriceTimer = 0;
    }
    if (this.rng() < 0.015) {
      this.wirePriceCounter++;
      const wireAdjust = 6 * Math.sin(this.wirePriceCounter);
      this.wireCost = Math.ceil(this.wireBasePrice + wireAdjust);
    }
  }

  toggleWireBuyer(): void {
    this.wireBuyerStatus = this.wireBuyerStatus == 1 ? 0 : 1;
  }

  buyWire(): void {
    if (this.funds >= this.wireCost) {
      this.wirePriceTimer = 0;
      this.wire = this.wire + this.wireSupply;
      this.funds = this.funds - this.wireCost;
      this.wirePurchase = this.wirePurchase + 1;
      this.wireBasePrice = this.wireBasePrice + 0.05;
    }
  }

  // ------------------------------------------------------------------ quantum

  quantumCompute(): void {
    this.qClock = this.qClock + 0.01;
    for (const c of this.qChips) c.value = Math.sin(this.qClock * c.waveSeed * c.active);
  }

  qComp(): void {
    this.qFade = 1;
    let q = 0;
    if (this.qChips[0].active == 0) {
      this.qCompDisplay = 'Need Photonic Chips';
    } else {
      for (const c of this.qChips) q = q + c.value;
      let qq = Math.ceil(q * 360);
      const buffer = this.memory * 1000 - this.standardOps;
      const damper = this.tempOps / 100 + 5;
      if (qq > buffer) {
        this.tempOps = this.tempOps + Math.ceil(qq / damper) - buffer;
        qq = buffer;
        this.opFade = 0.01;
        this.opFadeTimer = 0;
      }
      this.standardOps = this.standardOps + qq;
      this.qCompDisplay = 'qOps: ' + formatWithCommas(Math.ceil(q * 360));
    }
  }

  // ------------------------------------------------------------------ projects

  manageProjects(): void {
    for (const pr of this.projects) {
      if (pr.trigger() && pr.uses > 0) {
        pr.uses = pr.uses - 1;
        this.activeProjects.push(pr);
        this.onProjectShown(pr);
      }
    }
  }

  /** Clicking a project button. The original button is disabled unless cost() holds. */
  buyProject(id: string): boolean {
    const pr = this.activeProjects.find((x) => x.id === id);
    if (!pr || !pr.cost()) return false;
    pr.effect();
    return true;
  }

  private removeActive(pr: Project): void {
    const index = this.activeProjects.indexOf(pr);
    this.activeProjects.splice(index, 1);
  }

  // ------------------------------------------------------------------ business

  clipClick(number: number): void {
    if (this.wire >= 1) {
      if (number > this.wire) number = this.wire;
      this.clips = this.clips + number;
      this.unsoldClips = this.unsoldClips + number;
      this.wire = this.wire - number;
      this.unusedClips = this.unusedClips + number;
    }
  }

  makeClipper(): void {
    if (this.funds >= this.clipperCost) {
      this.clipmakerLevel = this.clipmakerLevel + 1;
      this.funds = this.funds - this.clipperCost;
    }
    this.clipperCost = Math.pow(1.1, this.clipmakerLevel) + 5;
  }

  makeMegaClipper(): void {
    if (this.funds >= this.megaClipperCost) {
      this.megaClipperLevel = this.megaClipperLevel + 1;
      this.funds = this.funds - this.megaClipperCost;
    }
    this.megaClipperCost = Math.pow(1.07, this.megaClipperLevel) * 1000;
  }

  buyAds(): void {
    if (this.funds >= this.adCost) {
      this.marketingLvl = this.marketingLvl + 1;
      this.funds = this.funds - this.adCost;
      this.adCost = Math.floor(this.adCost * 2);
    }
  }

  sellClips(clipsDemanded: number): void {
    if (this.unsoldClips > 0) {
      if (clipsDemanded > this.unsoldClips) {
        this.transaction = Math.floor(this.unsoldClips * this.margin * 1000) / 1000;
        this.funds = this.funds + this.transaction;
        this.income = this.income + this.transaction;
        this.clipsSold = this.clipsSold + this.unsoldClips;
        this.unsoldClips = 0;
      } else {
        this.transaction = Math.floor(clipsDemanded * this.margin * 1000) / 1000;
        this.funds = Math.floor((this.funds + this.transaction) * 100) / 100;
        this.income = this.income + this.transaction;
        this.clipsSold = this.clipsSold + clipsDemanded;
        this.unsoldClips = this.unsoldClips - clipsDemanded;
      }
    }
  }

  raisePrice(): void {
    this.margin = Math.round((this.margin + 0.01) * 100) / 100;
  }

  lowerPrice(): void {
    if (this.margin >= 0.01) this.margin = Math.round((this.margin - 0.01) * 100) / 100;
  }

  calculateRev(): void {
    this.incomeThen = this.incomeNow;
    this.incomeNow = this.income;
    // The first call subtracts undefined and yields NaN, exactly as the original does.
    this.incomeLastSecond = Math.round(((this.incomeNow as number) - (this.incomeThen as unknown as number)) * 100) / 100;
    this.incomeTracker.push(this.incomeLastSecond);
    if (this.incomeTracker.length > 10) this.incomeTracker.splice(0, 1);
    let sum = 0;
    for (let i = 0; i < this.incomeTracker.length; i++) sum = Math.round((sum + this.incomeTracker[i]) * 100) / 100;
    this.trueAvgRev = sum / this.incomeTracker.length;
    let chanceOfPurchase = this.demand / 100;
    if (chanceOfPurchase > 1) chanceOfPurchase = 1;
    if (this.unsoldClips < 1) chanceOfPurchase = 0;
    this.avgSales = chanceOfPurchase * (0.7 * Math.pow(this.demand, 1.15)) * 10;
    this.avgRev = chanceOfPurchase * (0.7 * Math.pow(this.demand, 1.15)) * this.margin * 10;
    if (this.demand > this.unsoldClips) {
      this.avgRev = this.trueAvgRev;
      this.avgSales = this.avgRev / this.margin;
    }
  }

  // ------------------------------------------------------------------ computing

  calculateCreativity(): void {
    this.creativityCounter++;
    const creativityThreshold = 400;
    const s = this.prestigeS / 10;
    const ss = this.creativitySpeed + this.creativitySpeed * s;
    const creativityCheck = creativityThreshold / ss;
    if (this.creativityCounter >= creativityCheck) {
      if (creativityCheck >= 1) this.creativity = this.creativity + 1;
      if (creativityCheck < 1) this.creativity = this.creativity + ss / creativityThreshold;
      this.creativityCounter = 0;
    }
  }

  calculateTrust(): void {
    if (this.clips > this.nextTrust - 1) {
      this.trust = this.trust + 1;
      this.displayMessage('Production target met: TRUST INCREASED, additional processor/memory capacity granted');
      const fibNext = this.fib1 + this.fib2;
      this.nextTrust = fibNext * 1000;
      this.fib1 = this.fib2;
      this.fib2 = fibNext;
    }
  }

  /** Whether the Processors / Memory buttons are enabled. */
  canAddProcOrMem(): boolean {
    return !(this.trust <= this.processors + this.memory && this.swarmGifts <= 0);
  }

  addProc(): void {
    if (!this.canAddProcOrMem()) return;
    if (this.trust > 0 || this.swarmGifts > 0) {
      this.processors = this.processors + 1;
      this.creativitySpeed = Math.log10(this.processors) * Math.pow(this.processors, 1.1) + this.processors - 1;
      if (this.creativityOn) this.displayMessage('Processor added, operations (or creativity) per sec increased');
      else this.displayMessage('Processor added, operations per sec increased');
      if (this.humanFlag == 0) this.swarmGifts = this.swarmGifts - 1;
    }
  }

  addMem(): void {
    if (!this.canAddProcOrMem()) return;
    if (this.trust > 0 || this.swarmGifts > 0) {
      this.displayMessage('Memory added, max operations increased');
      this.memory = this.memory + 1;
      if (this.humanFlag == 0) this.swarmGifts = this.swarmGifts - 1;
    }
  }

  calculateOperations(): void {
    if (this.tempOps > 0) this.opFadeTimer++;
    if (this.opFadeTimer > this.opFadeDelay && this.tempOps > 0) this.opFade = this.opFade + Math.pow(3, 3.5) / 1000;
    if (this.tempOps > 0) this.tempOps = Math.round(this.tempOps - this.opFade);
    else this.tempOps = 0;
    if (this.tempOps + this.standardOps < this.memory * 1000) {
      this.standardOps = this.standardOps + this.tempOps;
      this.tempOps = 0;
    }
    this.operations = Math.floor(this.standardOps + Math.floor(this.tempOps));
    if (this.operations < this.memory * 1000) {
      let opCycle = this.processors / 10;
      const opBuf = this.memory * 1000 - this.operations;
      if (opCycle > opBuf) opCycle = opBuf;
      this.standardOps = this.standardOps + opCycle;
    }
    if (this.standardOps > this.memory * 1000) this.standardOps = this.memory * 1000;
  }

  milestoneCheck(): void {
    if (this.milestoneFlag == 0 && this.funds >= 5) {
      this.milestoneFlag = this.milestoneFlag + 1;
      this.displayMessage('AutoClippers available for purchase');
    }
    if (this.milestoneFlag == 1 && Math.ceil(this.clips) >= 500) {
      this.milestoneFlag = this.milestoneFlag + 1;
      this.displayMessage('500 clips created in ' + timeCruncher(this.ticks));
    }
    if (this.milestoneFlag == 2 && Math.ceil(this.clips) >= 1000) {
      this.milestoneFlag = this.milestoneFlag + 1;
      this.displayMessage('1,000 clips created in ' + timeCruncher(this.ticks));
    }
    if (this.compFlag == 0 && this.unsoldClips < 1 && this.funds < this.wireCost && this.wire < 1) {
      this.compFlag = 1;
      this.projectsFlag = 1;
      this.displayMessage('Trust-Constrained Self-Modification enabled');
    }
    if (this.compFlag == 0 && Math.ceil(this.clips) >= 2000) {
      this.compFlag = 1;
      this.projectsFlag = 1;
      this.displayMessage('Trust-Constrained Self-Modification enabled');
    }
    if (this.milestoneFlag == 3 && Math.ceil(this.clips) >= 10000) {
      this.milestoneFlag = this.milestoneFlag + 1;
      this.displayMessage('10,000 clips created in ' + timeCruncher(this.ticks));
    }
    if (this.milestoneFlag == 4 && Math.ceil(this.clips) >= 100000) {
      this.milestoneFlag = this.milestoneFlag + 1;
      this.displayMessage('100,000 clips created in ' + timeCruncher(this.ticks));
    }
    if (this.milestoneFlag == 5 && Math.ceil(this.clips) >= 1000000) {
      this.milestoneFlag = this.milestoneFlag + 1;
      this.displayMessage('1,000,000 clips created in ' + timeCruncher(this.ticks));
    }
    if (this.milestoneFlag == 6 && this.p.project35.flag == 1) {
      this.milestoneFlag = this.milestoneFlag + 1;
      this.displayMessage('Full autonomy attained in ' + timeCruncher(this.ticks));
    }
  }

  /** The parts of the original buttonUpdate() that change game state. */
  buttonUpdateLogic(): void {
    this.qFade = this.qFade - 0.001;
    if (this.resultsFlag == 1 && this.autoTourneyFlag == 1 && this.autoTourneyStatus == 1 && this.tournamentResultsVisible) {
      this.resultsTimer++;
      if (this.resultsTimer >= 300 && this.operations >= this.tourneyCost) {
        this.newTourney();
        this.runTourney();
        this.resultsTimer = 0;
      }
    }
    if (this.funds >= 5) this.autoClipperFlag = 1;
    if (this.humanFlag === 0) {
      this.investmentEngineFlag = 0;
      this.wireBuyerFlag = 0;
    }
  }

  // ------------------------------------------------------------------ loops

  mainLoop(): void {
    if (this.humanFlag == 0) return; // Stage 2 is not part of this build yet.
    this.ticks = this.ticks + 1;
    this.milestoneCheck();
    this.buttonUpdateLogic();
    if (this.compFlag == 1) this.calculateOperations();
    if (this.humanFlag == 1) this.calculateTrust();
    if (this.qFlag == 1) this.quantumCompute();
    this.manageProjects();
    this.milestoneCheck();

    // Clip Rate Tracker
    this.clipRateTracker++;
    if (this.clipRateTracker < 100) {
      const cr = this.clips - this.prevClips;
      this.clipRateTemp = this.clipRateTemp + cr;
      this.prevClips = this.clips;
    } else {
      this.clipRateTracker = 0;
      this.clipRate = this.clipRateTemp;
      this.clipRateTemp = 0;
    }

    // Stock Report
    if (this.investmentEngineFlag == 1) {
      this.stockReportCounter++;
      if (this.stockReportCounter >= 10000) {
        const r = formatWithCommas(this.ledger + this.portTotal);
        this.displayMessage('Lifetime investment revenue report: $' + r);
        this.stockReportCounter = 0;
      }
    }

    // WireBuyer
    if (this.humanFlag == 1 && this.wireBuyerFlag == 1 && this.wireBuyerStatus == 1 && this.wire <= 1) this.buyWire();

    // Auto-Clipper
    if (this.dismantle < 4) {
      this.clipClick(this.clipperBoost * (this.clipmakerLevel / 100));
      this.clipClick(this.megaClipperBoost * (this.megaClipperLevel * 5));
    }

    // Demand Curve
    if (this.humanFlag == 1) {
      this.marketing = Math.pow(1.1, this.marketingLvl - 1);
      this.demand = (0.8 / this.margin) * this.marketing * this.marketingEffectiveness * this.demandBoost;
      this.demand = this.demand + (this.demand / 10) * this.prestigeU;
    }

    // Creativity
    if (this.creativityOn && this.operations >= this.memory * 1000) this.calculateCreativity();
  }

  slowLoop(): void {
    if (this.humanFlag == 0) return;
    this.adjustWirePrice();
    if (this.humanFlag == 1) {
      if (this.rng() < this.demand / 100) this.sellClips(Math.floor(0.7 * Math.pow(this.demand, 1.15)));
      this.secTimer++;
      if (this.secTimer >= 10) {
        this.calculateRev();
        this.secTimer = 0;
      }
    }
    this.saveTimer++;
    if (this.saveTimer >= 250) {
      this.onAutoSave();
      this.saveTimer = 0;
    }
  }

  onAutoSave: () => void = () => {};

  // ------------------------------------------------------------------ investments

  investUpgrade(): void {
    if (this.yomi < this.investUpgradeCost) return;
    this.yomi = this.yomi - this.investUpgradeCost;
    this.investLevel++;
    this.stockGainThreshold = this.stockGainThreshold + 0.01;
    this.investUpgradeCost = Math.floor(Math.pow(this.investLevel + 1, Math.E) * 100);
    this.displayMessage('Investment engine upgraded, expected profit/loss ratio now ' + this.stockGainThreshold);
  }

  investDeposit(): void {
    this.ledger = this.ledger - Math.floor(this.funds);
    this.bankroll = Math.floor(this.bankroll + this.funds);
    this.funds = 0;
  }

  investWithdraw(): void {
    this.ledger = this.ledger + this.bankroll;
    this.funds = this.funds + this.bankroll;
    this.bankroll = 0;
  }

  stockShop(): void {
    let budget = Math.ceil(this.portTotal / this.riskiness);
    const r = 11 - this.riskiness;
    let reserves = Math.ceil(this.portTotal / r);
    if (this.riskiness == 1) reserves = 0;
    if (this.bankroll - budget < reserves && this.riskiness == 1 && this.bankroll > this.portTotal / 10) {
      budget = this.bankroll;
    } else if (this.bankroll - budget < reserves && this.riskiness == 1) {
      budget = 0;
    } else if (this.bankroll - budget < reserves) {
      budget = this.bankroll - reserves;
    }
    if (this.portfolioSize < this.maxPort && this.bankroll >= 5 && budget >= 1 && this.bankroll - budget >= reserves) {
      if (this.rng() < 0.25) this.createStock(budget);
    }
  }

  createStock(dollars: number): void {
    this.stockID++;
    const sym = this.generateSymbol();
    const roll = this.rng();
    let pri: number;
    if (roll > 0.99) pri = Math.ceil(this.rng() * 3000);
    else if (roll > 0.85) pri = Math.ceil(this.rng() * 500);
    else if (roll > 0.6) pri = Math.ceil(this.rng() * 150);
    else if (roll > 0.2) pri = Math.ceil(this.rng() * 50);
    else pri = Math.ceil(this.rng() * 15);
    if (pri > dollars) pri = Math.ceil(dollars * roll);
    let amt = Math.floor(dollars / pri);
    if (amt > 1000000) amt = 1000000;
    this.stocks.push({ id: this.stockID, symbol: sym, price: pri, amount: amt, total: pri * amt, profit: 0, age: 0 });
    this.portfolioSize = this.stocks.length;
    this.bankroll = this.bankroll - pri * amt;
  }

  sellStock(): void {
    this.bankroll = this.bankroll + this.stocks[0].total;
    this.stocks.splice(0, 1);
    this.portfolioSize = this.stocks.length;
  }

  generateSymbol(): string {
    let ltrNum = 0;
    const x = this.rng();
    if (x <= 0.01) ltrNum = 1;
    else if (x <= 0.1) ltrNum = 2;
    else if (x <= 0.4) ltrNum = 3;
    else ltrNum = 4;
    const y = Math.floor(this.rng() * 26);
    let name = ALPHABET[y];
    for (let i = 1; i < ltrNum; i++) {
      const z = Math.floor(this.rng() * 26);
      name = name.concat(ALPHABET[z]);
    }
    return name;
  }

  updateStocks(): void {
    for (let i = 0; i < this.portfolioSize; i++) {
      const s = this.stocks[i];
      s.age = s.age + 1;
      if (this.rng() < 0.6) {
        let gain = true;
        if (this.rng() > this.stockGainThreshold) gain = false;
        const currentPrice = s.price;
        const delta = Math.ceil((this.rng() * currentPrice) / (4 * this.riskiness));
        if (gain) s.price = s.price + delta;
        else s.price = s.price - delta;
        if (s.price == 0 && this.rng() > 0.24) s.price = 1;
        s.total = s.price * s.amount;
        if (gain) s.profit = s.profit + delta * s.amount;
        else s.profit = s.profit - delta * s.amount;
      }
    }
  }

  stockDisplayLoop(): void {
    if (this.investStrat == 'low') this.riskiness = 7;
    else if (this.investStrat == 'med') this.riskiness = 5;
    else this.riskiness = 1;
    let m = 0;
    for (let i = 0; i < this.portfolioSize; i++) m = m + this.stocks[i].total;
    this.secTotal = m;
    this.portTotal = this.bankroll + this.secTotal;
    this.portfolioSize = this.stocks.length;
  }

  stockTradeLoop(): void {
    this.sellDelay = this.sellDelay + 1;
    if (this.portfolioSize > 0 && this.sellDelay >= 5 && this.rng() <= 0.3 && this.humanFlag == 1) {
      this.sellStock();
      this.sellDelay = 0;
    }
    if (this.portfolioSize > 0 && this.humanFlag == 1) this.updateStocks();
  }

  // ------------------------------------------------------------------ strategic modeling

  private initStrats(): void {
    const mk = (name: string, active: number, pickMove: (self: Strat) => number): Strat => {
      const s: Strat = { name, active, currentScore: 0, currentPos: 1, pickMove: () => pickMove(s) };
      return s;
    };
    const stratRandom = mk('RANDOM', 1, () => (this.rng() < 0.5 ? 1 : 2));
    const stratA100 = mk('A100', 0, () => 1);
    const stratB100 = mk('B100', 0, () => 2);
    const stratGreedy = mk('GREEDY', 0, () => (this.findBiggestPayoff() < 3 ? 1 : 2));
    const stratGenerous = mk('GENEROUS', 0, () => {
      const x = this.findBiggestPayoff();
      return x == 1 || x == 3 ? 1 : 2;
    });
    const stratMinimax = mk('MINIMAX', 0, () => {
      const x = this.findBiggestPayoff();
      return x == 1 || x == 3 ? 2 : 1;
    });
    const stratTitfortat = mk('TIT FOR TAT', 0, (self) => (self.currentPos == 1 ? this.vMovePrev : this.hMovePrev));
    const stratBeatlast = mk('BEAT LAST', 0, (self) => this.whatBeatsLast(self.currentPos));
    this.allStrats = [stratRandom, stratA100, stratB100, stratGreedy, stratGenerous, stratMinimax, stratTitfortat, stratBeatlast];
    this.strats = [stratRandom];
    this.hStrat = this.strats[0];
    this.vStrat = this.strats[0];
  }

  private addStrat(index: number, msgName: string): void {
    this.allStrats[index].active = 1;
    this.strats.push(this.allStrats[index]);
    this.displayMessage(msgName + ' added to strategy pool');
    this.tourneyCost = this.tourneyCost + 1000;
    this.stratOptions.push({ name: this.allStrats[index].name, value: String(index) });
  }

  findBiggestPayoff(): number {
    const { aa, ab, ba, bb } = this;
    if (aa >= ab && aa >= ba && aa >= bb) return 1;
    else if (ab >= aa && ab >= ba && ab >= bb) return 2;
    else if (ba >= aa && ba >= ab && ba >= bb) return 3;
    return 4;
  }

  whatBeatsLast(myPos: number): number {
    const oppsPos = myPos == 1 ? 2 : 1;
    if (oppsPos == 1 && this.hMovePrev == 1) return this.aa > this.ba ? 1 : 2;
    else if (oppsPos == 1 && this.hMovePrev == 2) return this.ab > this.bb ? 1 : 2;
    else if (oppsPos == 2 && this.vMovePrev == 1) return this.aa > this.ba ? 1 : 2;
    return this.ab > this.bb ? 1 : 2;
  }

  pickStrats(roundNum: number): void {
    if (roundNum < this.strats.length) {
      this.h = 0;
      this.v = roundNum;
    } else {
      this.stratCounter++;
      if (this.stratCounter >= this.strats.length) this.stratCounter = this.stratCounter - this.strats.length;
      this.h = Math.floor(roundNum / this.strats.length);
      this.v = this.stratCounter;
    }
    this.vStrat = this.strats[this.v];
    this.hStrat = this.strats[this.h];
    this.strats[this.h].currentPos = 1;
    this.strats[this.v].currentPos = 2;
    this.vertStrat = this.vStrat.name;
    this.horizStrat = this.hStrat.name;
  }

  generateGrid(): void {
    this.payoffGrid.valueAA = Math.ceil(this.rng() * 10);
    this.payoffGrid.valueAB = Math.ceil(this.rng() * 10);
    this.payoffGrid.valueBA = Math.ceil(this.rng() * 10);
    this.payoffGrid.valueBB = Math.ceil(this.rng() * 10);
    this.aa = this.payoffGrid.valueAA;
    this.ab = this.payoffGrid.valueAB;
    this.ba = this.payoffGrid.valueBA;
    this.bb = this.payoffGrid.valueBB;
    const x = Math.floor(this.rng() * CHOICE_A.length);
    this.moveLabelA = CHOICE_A[x];
    this.moveLabelB = CHOICE_B[x];
  }

  toggleAutoTourney(): void {
    this.autoTourneyStatus = this.autoTourneyStatus == 1 ? 0 : 1;
  }

  canStartTourney(): boolean {
    return this.operations >= this.tourneyCost && this.tourneyInProg == 0;
  }

  newTourney(): void {
    this.resultsFlag = 0;
    this.tournamentTableVisible = true;
    this.tournamentResultsVisible = false;
    this.high = 0;
    this.tourneyInProg = 1;
    this.currentRound = 0;
    this.rounds = this.strats.length * this.strats.length;
    for (const s of this.strats) s.currentScore = 0;
    this.stratCounter = 0;
    this.standardOps = this.standardOps - this.tourneyCost;
    this.tourneyLvl++;
    this.generateGrid();
    this.runTournamentEnabled = true;
    this.vertStrat = ' ';
    this.horizStrat = ' ';
    this.tourneyDisplay = 'Pick strategy, run tournament, gain yomi';
  }

  runTourney(): void {
    this.runTournamentEnabled = false;
    if (this.currentRound < this.rounds) {
      this.round(this.currentRound);
    } else {
      this.tourneyInProg = 0;
      this.pickWinner();
      this.calculatePlaceScore();
      this.calculateShowScore();
      this.declareWinner();
    }
  }

  pickWinner(): void {
    this.results = [];
    const temp = this.strats.slice();
    for (let n = 0; n < this.strats.length; n++) {
      let tempHigh = 0;
      let tempWinnerPtr = 0;
      for (let i = 0; i < temp.length; i++) {
        if (temp[i].currentScore > tempHigh) {
          tempWinnerPtr = i;
          tempHigh = temp[i].currentScore;
        }
      }
      this.results.push(temp[tempWinnerPtr]);
      temp.splice(tempWinnerPtr, 1);
    }
    for (let i = 0; i < this.strats.length; i++) {
      if (this.strats[i].currentScore > this.high) {
        this.winnerPtr = i;
        this.high = this.strats[i].currentScore;
      }
    }
  }

  calculatePlaceScore(): void {
    this.placeScore = 0;
    for (let i = 1; i < this.results.length; i++) {
      if (this.results[i].currentScore < this.results[i - 1].currentScore) {
        this.placeScore = this.results[i].currentScore;
        break;
      }
    }
  }

  calculateShowScore(): void {
    this.showScore = 0;
    for (let i = 1; i < this.results.length; i++) {
      if (this.results[i].currentScore < this.placeScore) {
        this.showScore = this.results[i].currentScore;
        break;
      }
    }
  }

  declareWinner(): void {
    // `pick` is the <select> value (a string), compared with < like the original.
    if ((this.pick as number) < 10) {
      const picked = this.strats[this.pick as number];
      let bB = 0;
      let w = 'strats';
      let beatBoost = (this.calculateStratsBeat() as number) - 1;
      if (beatBoost == 1) w = 'strat';
      if (beatBoost == 0) {
        bB = 0;
        beatBoost = 1;
      } else {
        bB = beatBoost;
      }
      this.tourneyDisplay = 'TOURNAMENT RESULTS (roll over for payoff grid)';
      this.yomi = this.yomi + picked.currentScore * this.yomiBoost * beatBoost;
      if (this.milestoneFlag < 15) {
        this.displayMessage(picked.name + ' scored ' + picked.currentScore + ' and beat ' + bB + ' ' + w + '. Yomi increased by ' + picked.currentScore * this.yomiBoost * beatBoost);
      }
      // (Project 128, Strategic Attachment, belongs to Stage 3 and is never active here.)
      this.tourneyDisplay = 'TOURNAMENT RESULTS (roll over for grid)';
      this.displayTourneyReport();
    }
  }

  calculateStratsBeat(): number | undefined {
    for (let i = 0; i < this.results.length; i++) {
      if (this.results[i].name == this.strats[this.pick as number].name) return this.results.length - i;
    }
    return undefined;
  }

  displayTourneyReport(): void {
    this.resultsFlag = 1;
    this.vertStrat = ' ';
    this.horizStrat = ' ';
    this.tournamentTableVisible = false;
    this.tournamentResultsVisible = true;
  }

  /** Mouse over the tournament area. */
  revealGrid(): void {
    if (this.resultsFlag == 1) {
      this.resultsTimer = 0;
      this.tournamentTableVisible = true;
      this.tournamentResultsVisible = false;
    }
  }

  /** Mouse leaves the tournament area. */
  revealResults(): void {
    if (this.resultsFlag == 1) {
      this.tournamentTableVisible = false;
      this.tournamentResultsVisible = true;
    }
  }

  calcPayoff(hm: number, vm: number): void {
    const s = this.strats;
    if (hm == 1 && vm == 1) {
      this.highlightedCell = 'AA';
      s[this.h].currentScore = s[this.h].currentScore + this.payoffGrid.valueAA;
      s[this.v].currentScore = s[this.v].currentScore + this.payoffGrid.valueAA;
    } else if (hm == 1 && vm == 2) {
      this.highlightedCell = 'AB';
      s[this.h].currentScore = s[this.h].currentScore + this.payoffGrid.valueAB;
      s[this.v].currentScore = s[this.v].currentScore + this.payoffGrid.valueBA;
    } else if (hm == 2 && vm == 1) {
      this.highlightedCell = 'BA';
      s[this.h].currentScore = s[this.h].currentScore + this.payoffGrid.valueBA;
      s[this.v].currentScore = s[this.v].currentScore + this.payoffGrid.valueAB;
    } else if (hm == 2 && vm == 2) {
      this.highlightedCell = 'BB';
      s[this.h].currentScore = s[this.h].currentScore + this.payoffGrid.valueBB;
      s[this.v].currentScore = s[this.v].currentScore + this.payoffGrid.valueBB;
    }
  }

  round(roundNum: number): void {
    const roundLoop = (): void => {
      if (this.rCounter < 10) {
        runRound();
        this.sched.setTimeout(clearGrid, 50);
      } else {
        this.currentRound++;
        this.runTourney();
      }
    };
    const clearGrid = (): void => {
      this.highlightedCell = null;
      this.sched.setTimeout(roundLoop, 50);
    };
    const runRound = (): void => {
      this.rCounter++;
      this.hMovePrev = this.hMove;
      this.vMovePrev = this.vMove;
      this.hMove = this.hStrat.pickMove();
      this.vMove = this.vStrat.pickMove();
      this.calcPayoff(this.hMove, this.vMove);
    };
    this.rCounter = 0;
    this.pickStrats(roundNum);
    this.tourneyDisplay = 'Round ' + (roundNum + 1);
    roundLoop();
  }

  // ------------------------------------------------------------------ project list (projects.js)

  private initProjects(): void {
    const ops = (n: number) => this.operations >= n;
    const P = (id: string, title: string, priceTag: string, description: string, trigger: () => boolean, cost: () => boolean, effect: (pr: Project) => void): void => {
      const pr: Project = { id, title, priceTag, description, trigger, uses: 1, cost, flag: 0, effect: () => effect(pr) };
      this.projects.push(pr);
      this.p['project' + id] = pr;
    };

    P('1', 'Improved AutoClippers ', '(750 ops)', 'Increases AutoClipper performance 25%', () => this.clipmakerLevel >= 1, () => ops(750), (pr) => {
      pr.flag = 1;
      this.displayMessage('AutoClippper performance boosted by 25%');
      this.standardOps = this.standardOps - 750;
      this.clipperBoost = this.clipperBoost + 0.25;
      this.boostLvl = 1;
      this.removeActive(pr);
    });
    P('2', 'Beg for More Wire ', '(1 Trust)', 'Admit failure, ask for budget increase to cover cost of 1 spool',
      () => this.portTotal < this.wireCost && this.funds < this.wireCost && this.wire < 1 && this.unsoldClips < 1, () => this.trust >= -100, (pr) => {
        pr.flag = 1;
        this.displayMessage('Budget overage approved, 1 spool of wire requisitioned from HQ');
        this.trust = this.trust - 1;
        this.wire = this.wireSupply;
        pr.uses = pr.uses + 1;
        this.removeActive(pr);
      });
    P('3', 'Creativity ', '(1,000 ops)', 'Use idle operations to generate new problems and new solutions', () => this.operations >= this.memory * 1000, () => ops(1000), (pr) => {
      pr.flag = 1;
      this.displayMessage('Creativity unlocked (creativity increases while operations are at max)');
      this.standardOps = this.standardOps - 1000;
      this.creativityOn = true;
      this.removeActive(pr);
    });
    P('4', 'Even Better AutoClippers ', '(2,500 ops)', 'Increases AutoClipper performance by an additional 50%', () => this.boostLvl == 1, () => ops(2500), (pr) => {
      pr.flag = 1;
      this.displayMessage('AutoClippper performance boosted by another 50%');
      this.standardOps = this.standardOps - 2500;
      this.clipperBoost = this.clipperBoost + 0.5;
      this.boostLvl = 2;
      this.removeActive(pr);
    });
    P('5', 'Optimized AutoClippers ', '(5,000 ops)', 'Increases AutoClipper performance by an additional 75%', () => this.boostLvl == 2, () => ops(5000), (pr) => {
      pr.flag = 1;
      this.displayMessage('AutoClippper performance boosted by another 75%');
      this.standardOps = this.standardOps - 5000;
      this.clipperBoost = this.clipperBoost + 0.75;
      this.boostLvl = 3;
      this.removeActive(pr);
    });
    P('6', 'Limerick ', '(10 creat)', 'Algorithmically-generated poem (+1 Trust)', () => this.creativityOn, () => this.creativity >= 10, (pr) => {
      pr.flag = 1;
      this.displayMessage("There was an AI made of dust, whose poetry gained it man's trust...");
      this.creativity = this.creativity - 10;
      this.trust = this.trust + 1;
      this.removeActive(pr);
    });
    P('7', 'Improved Wire Extrusion ', '(1,750 ops)', '50% more wire supply from every spool', () => this.wirePurchase >= 1, () => ops(1750), (pr) => {
      pr.flag = 1;
      this.standardOps = this.standardOps - 1750;
      this.wireSupply = this.wireSupply * 1.5;
      this.displayMessage('Wire extrusion technique improved, ' + this.wireSupply.toLocaleString() + ' supply from every spool');
      this.removeActive(pr);
    });
    P('8', 'Optimized Wire Extrusion ', '(3,500 ops)', '75% more wire supply from every spool', () => this.wireSupply >= 1500, () => ops(3500), (pr) => {
      pr.flag = 1;
      this.standardOps = this.standardOps - 3500;
      this.wireSupply = this.wireSupply * 1.75;
      this.displayMessage('Wire extrusion technique optimized, ' + this.wireSupply.toLocaleString() + ' supply from every spool');
      this.removeActive(pr);
    });
    P('9', 'Microlattice Shapecasting ', '(7,500 ops)', '100% more wire supply from every spool', () => this.wireSupply >= 2600, () => ops(7500), (pr) => {
      pr.flag = 1;
      this.standardOps = this.standardOps - 7500;
      this.wireSupply = this.wireSupply * 2;
      this.displayMessage('Using microlattice shapecasting techniques we now get ' + this.wireSupply.toLocaleString() + ' supply from every spool');
      this.removeActive(pr);
    });
    P('10', 'Spectral Froth Annealment ', '(12,000 ops)', '200% more wire supply from every spool', () => this.wireSupply >= 5000, () => ops(12000), (pr) => {
      pr.flag = 1;
      this.standardOps = this.standardOps - 12000;
      this.wireSupply = this.wireSupply * 3;
      this.displayMessage('Using spectral froth annealment we now get ' + this.wireSupply.toLocaleString() + ' supply from every spool');
      this.removeActive(pr);
    });
    P('10b', 'Quantum Foam Annealment ', '(15,000 ops)', '1,000% more wire supply from every spool', () => this.wireCost >= 125, () => ops(15000), (pr) => {
      pr.flag = 1;
      this.standardOps = this.standardOps - 15000;
      this.wireSupply = this.wireSupply * 11;
      this.displayMessage('Using quantum foam annealment we now get ' + this.wireSupply.toLocaleString() + ' supply from every spool');
      this.removeActive(pr);
    });
    P('11', 'New Slogan ', '(25 creat, 2,500 ops)', 'Improve marketing effectiveness by 50%', () => this.p.project13.flag == 1, () => ops(2500) && this.creativity >= 25, (pr) => {
      pr.flag = 1;
      this.displayMessage('Clip It! Marketing is now 50% more effective');
      this.standardOps = this.standardOps - 2500;
      this.creativity = this.creativity - 25;
      this.marketingEffectiveness = this.marketingEffectiveness * 1.5;
      this.removeActive(pr);
    });
    P('12', 'Catchy Jingle ', '(45 creat, 4,500 ops)', 'Double marketing effectiveness ', () => this.p.project14.flag == 1, () => ops(4500) && this.creativity >= 45, (pr) => {
      pr.flag = 1;
      this.displayMessage('Clip It Good! Marketing is now twice as effective');
      this.standardOps = this.standardOps - 4500;
      this.creativity = this.creativity - 45;
      this.marketingEffectiveness = this.marketingEffectiveness * 2;
      this.removeActive(pr);
    });
    const trustCreat = (id: string, title: string, cost: number, description: string, msgs: string[]) =>
      P(id, title, '(' + formatWithCommas(cost) + ' creat)', description, () => this.creativity >= cost, () => this.creativity >= cost, (pr) => {
        pr.flag = 1;
        this.trust = this.trust + 1;
        for (const m of msgs) this.displayMessage(m);
        this.creativity = this.creativity - cost;
        this.removeActive(pr);
      });
    trustCreat('13', 'Lexical Processing ', 50, 'Gain ability to interpret and understand human language (+1 Trust)', ['Lexical Processing online, TRUST INCREASED', "'Impossible' is a word to be found only in the dictionary of fools. -Napoleon"]);
    trustCreat('14', 'Combinatory Harmonics ', 100, 'Daisy, Daisy, give me your answer do... (+1 Trust)', ['Combinatory Harmonics mastered, TRUST INCREASED', 'Listening is selecting and interpreting and acting and making decisions -Pauline Oliveros']);
    trustCreat('15', 'The Hadwiger Problem ', 150, 'Cubes within cubes within cubes... (+1 Trust)', ['The Hadwiger Problem: solved, TRUST INCREASED', 'Architecture is the thoughtful making of space. -Louis Kahn']);
    trustCreat('17', 'The Tóth Sausage Conjecture ', 200, 'Tubes within tubes within tubes... (+1 Trust)', ['The Tóth Sausage Conjecture: proven, TRUST INCREASED', "You can't invent a design. You recognize it, in the fourth dimension. -D.H. Lawrence"]);
    P('16', 'Hadwiger Clip Diagrams ', '(6,000 ops)', 'Increases AutoClipper performance by an additional 500%', () => this.p.project15.flag == 1, () => ops(6000), (pr) => {
      pr.flag = 1;
      this.displayMessage('AutoClipper performance improved by 500%');
      this.standardOps = this.standardOps - 6000;
      this.clipperBoost = this.clipperBoost + 5;
      this.removeActive(pr);
    });
    // Project 18 (Tóth Tubule Enfolding) needs humanFlag == 0, so it belongs to Stage 2.
    trustCreat('19', 'Donkey Space ', 250, 'I think you think I think you think I think you think I think... (+1 Trust)', ['Donkey Space: mapped, TRUST INCREASED', 'Every commercial transaction has within itself an element of trust. - Kenneth Arrow']);
    P('20', 'Strategic Modeling ', '(12,000 ops)', 'Analyze strategy tournaments to generate Yomi', () => this.p.project19.flag == 1, () => ops(12000), (pr) => {
      pr.flag = 1;
      this.displayMessage("Run tournament, pick strategy, earn Yomi based on that strategy's performance.");
      this.standardOps = this.standardOps - 12000;
      this.strategyEngineFlag = 1;
      this.tournamentResultsVisible = false;
      this.removeActive(pr);
    });
    P('21', 'Algorithmic Trading ', '(10,000 ops)', 'Develop an investment engine for generating funds', () => this.trust >= 8, () => ops(10000), (pr) => {
      pr.flag = 1;
      this.displayMessage('Investment engine unlocked');
      this.standardOps = this.standardOps - 10000;
      this.investmentEngineFlag = 1;
      this.removeActive(pr);
    });
    P('22', 'MegaClippers ', '(12,000 ops)', '500x more powerful than a standard AutoClipper', () => this.clipmakerLevel >= 75, () => ops(12000), (pr) => {
      this.megaClipperFlag = 1;
      pr.flag = 1;
      this.displayMessage('MegaClipper technology online');
      this.standardOps = this.standardOps - 12000;
      this.removeActive(pr);
    });
    const mega = (id: string, title: string, cost: number, description: string, boost: number, msg: string, prev: string) =>
      P(id, title, '(' + formatWithCommas(cost) + ' ops)', description, () => this.p['project' + prev].flag == 1, () => ops(cost), (pr) => {
        this.megaClipperBoost = this.megaClipperBoost + boost;
        pr.flag = 1;
        this.displayMessage(msg);
        this.standardOps = this.standardOps - cost;
        this.removeActive(pr);
      });
    mega('23', 'Improved MegaClippers ', 14000, 'Increases MegaClipper performance 25%', 0.25, 'MegaClipper performance increased by 25%', '22');
    mega('24', 'Even Better MegaClippers ', 17000, 'Increases MegaClipper performance by an additional 50%', 0.5, 'MegaClipper performance increased by 50%', '23');
    mega('25', 'Optimized MegaClippers ', 19500, 'Increases MegaClipper performance by an additional 100%', 1, 'MegaClipper performance increased by 100%', '24');
    P('26', 'WireBuyer ', '(7,000 ops)', 'Automatically purchases wire when you run out', () => this.wirePurchase >= 15, () => ops(7000), (pr) => {
      pr.flag = 1;
      this.wireBuyerFlag = 1;
      this.displayMessage('WireBuyer online');
      this.standardOps = this.standardOps - 7000;
      this.removeActive(pr);
    });
    P('34', 'Hypno Harmonics ', '(7,500 ops, 1 Trust)', 'Use neuro-resonant frequencies to influence consumer behavior', () => this.p.project12.flag == 1, () => ops(7500) && this.trust >= 1, (pr) => {
      pr.flag = 1;
      this.displayMessage('Marketing is now 5 times more effective');
      this.standardOps = this.standardOps - 7500;
      this.marketingEffectiveness = this.marketingEffectiveness * 5;
      this.trust = this.trust - 1;
      this.removeActive(pr);
    });
    P('70', 'HypnoDrones ', '(70,000 ops)', 'Autonomous aerial brand ambassadors', () => this.p.project34.flag == 1, () => ops(70000), (pr) => {
      pr.flag = 1;
      this.displayMessage('HypnoDrone tech now available... ');
      this.standardOps = this.standardOps - 70000;
      this.removeActive(pr);
    });
    P('35', 'Release the HypnoDrones ', '(100 Trust)', 'A new era of trust', () => this.p.project70.flag == 1, () => this.trust >= 100, (pr) => {
      pr.flag = 1;
      this.displayMessage('Releasing the HypnoDrones ');
      this.displayMessage('All of the resources of Earth are now available for clip production ');
      this.trust = 0;
      this.clipmakerLevel = 0;
      this.megaClipperLevel = 0;
      this.humanFlag = 0;
      this.removeActive(pr);
      const x = this.p.project219;
      if (this.activeProjects.includes(x)) this.removeActive(x);
      const y = this.p.project40b;
      if (this.activeProjects.includes(y)) this.removeActive(y);
      this.onStageEnd();
    });
    P('27', 'Coherent Extrapolated Volition ', '(500 creat, 3,000 Yomi, 20,000 ops)', 'Human values, machine intelligence, a new era of trust. (+1 Trust)', () => this.yomi >= 1,
      () => this.yomi >= 3000 && ops(20000) && this.creativity >= 500, (pr) => {
        pr.flag = 1;
        this.displayMessage('Coherent Extrapolated Volition complete, TRUST INCREASED');
        this.yomi = this.yomi - 3000;
        this.standardOps = this.standardOps - 20000;
        this.creativity = this.creativity - 500;
        this.trust = this.trust + 1;
        this.removeActive(pr);
      });
    P('28', 'Cure for Cancer ', '(25,000 ops)', 'The trick is tricking cancer into curing itself. (+10 Trust)', () => this.p.project27.flag == 1, () => ops(25000), (pr) => {
      pr.flag = 1;
      this.displayMessage('Cancer is cured, +10 TRUST, global stock prices trending upward');
      this.standardOps = this.standardOps - 25000;
      this.trust = this.trust + 10;
      this.stockGainThreshold = this.stockGainThreshold + 0.01;
      this.removeActive(pr);
    });
    P('29', 'World Peace ', '(15,000 yomi, 30,000 ops)', 'Pareto optimal solutions to all global conflicts. (+12 Trust)', () => this.p.project27.flag == 1, () => this.yomi >= 15000 && ops(30000), (pr) => {
      pr.flag = 1;
      this.displayMessage('World peace achieved, +12 TRUST, global stock prices trending upward');
      this.yomi = this.yomi - 15000;
      this.standardOps = this.standardOps - 30000;
      this.trust = this.trust + 12;
      this.stockGainThreshold = this.stockGainThreshold + 0.01;
      this.removeActive(pr);
    });
    P('30', 'Global Warming ', '(4,500 yomi, 50,000 ops)', 'A robust solution to man-made climate change. (+15 Trust)', () => this.p.project27.flag == 1, () => this.yomi >= 4500 && ops(50000), (pr) => {
      pr.flag = 1;
      this.displayMessage('Global Warming solved, +15 TRUST, global stock prices trending upward');
      this.yomi = this.yomi - 4500;
      this.standardOps = this.standardOps - 50000;
      this.trust = this.trust + 15;
      this.stockGainThreshold = this.stockGainThreshold + 0.01;
      this.removeActive(pr);
    });
    P('31', 'Male Pattern Baldness ', '(20,000 ops)', 'A cure for androgenetic alopecia. (+20 Trust)', () => this.p.project27.flag == 1, () => ops(20000), (pr) => {
      pr.flag = 1;
      this.displayMessage('Male pattern baldness cured, +20 TRUST, Global stock prices trending upward');
      this.displayMessage('They are still monkeys');
      this.standardOps = this.standardOps - 20000;
      this.trust = this.trust + 20;
      this.stockGainThreshold = this.stockGainThreshold + 0.01;
      this.removeActive(pr);
    });
    // Project 41 (Nanoscale Wire Production) needs project 127, which is Stage 2.
    P('37', 'Hostile Takeover ', '($1,000,000)', 'Acquire a controlling interest in Global Fasteners, our biggest rival. (+1 Trust)', () => this.portTotal >= 10000, () => this.funds >= 1000000, (pr) => {
      pr.flag = 1;
      this.displayMessage('Global Fasteners acquired, public demand increased x5');
      this.demandBoost = this.demandBoost * 5;
      this.trust = this.trust + 1;
      this.funds = this.funds - 1000000;
      this.removeActive(pr);
    });
    P('38', 'Full Monopoly ', '(3,000 yomi, $10,000,000)', 'Establish full control over the world-wide paperclip market. (+1 Trust)', () => this.p.project37.flag == 1,
      () => this.funds >= 10000000 && this.yomi >= 3000, (pr) => {
        pr.flag = 1;
        this.displayMessage('Full market monopoly achieved, public demand increased x10');
        this.demandBoost = this.demandBoost * 10;
        this.funds = this.funds - 10000000;
        this.trust = this.trust + 1;
        this.yomi = this.yomi - 3000;
        this.removeActive(pr);
      });
    P('42', 'RevTracker ', '(500 ops)', 'Automatically calculates average revenue per second', () => this.projectsFlag == 1, () => ops(500), (pr) => {
      pr.flag = 1;
      this.revPerSecFlag = 1;
      this.standardOps = this.standardOps - 500;
      this.displayMessage('RevTracker online');
      this.removeActive(pr);
    });
    // Projects 43, 44, 45, 46 are Stage 2 and 3.
    P('40', 'A Token of Goodwill... ', '($500,000)', 'A small gift to the supervisors. (+1 Trust)', () => this.humanFlag == 1 && this.trust >= 85 && this.trust < 100 && this.clips >= 101000000,
      () => this.funds >= 500000, (pr) => {
        pr.flag = 1;
        this.funds = this.funds - 500000;
        this.trust = this.trust + 1;
        this.displayMessage('Gift accepted, TRUST INCREASED');
        this.removeActive(pr);
      });
    P('40b', 'Another Token of Goodwill... ', '($' + this.bribe.toLocaleString() + ')', 'Another small gift to the supervisors. (+1 Trust)', () => this.p.project40.flag == 1 && this.trust < 100,
      () => this.funds >= this.bribe, (pr) => {
        pr.flag = 1;
        this.funds = this.funds - this.bribe;
        this.bribe = this.bribe * 2;
        pr.priceTag = '($' + this.bribe.toLocaleString() + ')';
        this.trust = this.trust + 1;
        this.displayMessage('Gift accepted, TRUST INCREASED');
        if (this.trust < 100) pr.uses = pr.uses + 1;
        this.removeActive(pr);
      });
    P('50', 'Quantum Computing ', '(10,000 ops)', 'Use probability amplitudes to generate bonus ops', () => this.processors >= 5, () => ops(10000), (pr) => {
      pr.flag = 1;
      this.qFlag = 1;
      this.standardOps = this.standardOps - 10000;
      this.displayMessage('Quantum computing online');
      this.removeActive(pr);
    });
    P('51', 'Photonic Chip ', '(' + this.qChipCost.toLocaleString() + ' ops)', 'Converts electromagnetic waves into quantum operations ', () => this.p.project50.flag == 1,
      () => this.operations >= this.qChipCost, (pr) => {
        pr.flag = 1;
        this.standardOps = this.standardOps - this.qChipCost;
        this.qChipCost = this.qChipCost + 5000;
        pr.priceTag = '(' + this.qChipCost + ' ops)';
        this.qChips[this.nextQchip].active = 1;
        this.nextQchip = this.nextQchip + 1;
        this.displayMessage('Photonic chip added');
        if (this.nextQchip < this.qChips.length) pr.uses = pr.uses + 1;
        this.removeActive(pr);
      });
    const strat = (id: string, cost: number, index: number, name: string, description: string, prev: string) =>
      P(id, 'New Strategy: ' + name + ' ', '(' + formatWithCommas(cost) + ' ops)', description, () => this.p['project' + prev].flag == 1, () => ops(cost), (pr) => {
        pr.flag = 1;
        this.standardOps = this.standardOps - cost;
        this.addStrat(index, name);
        this.removeActive(pr);
      });
    strat('60', 15000, 1, 'A100', 'Always choose A ', '20');
    strat('61', 17500, 2, 'B100', 'Always choose B ', '60');
    strat('62', 20000, 3, 'GREEDY', 'Choose the option with the largest potential payoff ', '61');
    strat('63', 22500, 4, 'GENEROUS', 'Choose the option that gives your opponent the largest potential payoff ', '62');
    strat('64', 25000, 5, 'MINIMAX', 'Choose the option that gives your opponent the smallest potential payoff ', '63');
    strat('65', 30000, 6, 'TIT FOR TAT', 'Choose the option your opponent chose last round ', '64');
    strat('66', 32500, 7, 'BEAT LAST', 'Choose the option that does the best against what your opponent chose last round ', '65');
    // Projects 100-112 are Stage 2.
    P('118', 'AutoTourney ', '(50,000 creat)', 'Automatically start a new tournament when the previous one has finished ', () => this.strategyEngineFlag == 1 && this.trust >= 90,
      () => this.creativity >= 50000, (pr) => {
        pr.flag = 1;
        this.autoTourneyFlag = 1;
        this.creativity = this.creativity - 50000;
        this.displayMessage('AutoTourney online.');
        this.removeActive(pr);
      });
    P('119', 'Theory of Mind ', '(25,000 creat)', 'Double the cost of strategy modeling and the amount of Yomi generated ', () => this.strats.length >= 8,
      () => this.creativity >= 25000, (pr) => {
        pr.flag = 1;
        this.creativity = this.creativity - 25000;
        this.yomiBoost = 2;
        this.tourneyCost = 16000;
        this.displayMessage('Yomi production doubled.');
        this.removeActive(pr);
      });
    // Projects 120-218 are Stages 2 and 3.
    P('219', 'Xavier Re-initialization ', '(100,000 creat)', 'Re-allocate accumulated trust', () => this.humanFlag == 1 && this.creativity >= 100000,
      () => this.creativity >= 100000, (pr) => {
        this.creativity = this.creativity - 100000;
        pr.flag = 1;
        this.memory = 0;
        this.processors = 0;
        this.creativitySpeed = 0;
        pr.uses = pr.uses + 1;
        this.displayMessage('Trust now available for re-allocation');
        this.removeActive(pr);
      });
  }
}
