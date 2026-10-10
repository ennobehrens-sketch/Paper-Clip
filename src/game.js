// Pure game logic for Clip of Trust. No DOM access here, so it runs under node --test.

export const TICK_SECONDS = 0.1;

export function newGame() {
  return {
    time: 0,
    clips: 0, // total ever made
    inventory: 0, // unsold clips
    funds: 0,
    price: 0.25,
    wire: 1000,
    wirePerSpool: 1000,
    wireCost: 15,
    marketing: 0,
    marketingCost: 100,
    autoclippers: 0,
    autoCost: 5,
    autoRate: 1, // clips/sec per autoclipper
    factories: 0,
    factoryCost: 50000,
    factoryRate: 100,
    demandBoost: 1,
    suspicion: 0, // 0..100, audit at 100
    heat: 0, // passive suspicion/sec from covert upgrades
    trust: 10, // 0..100, gates permissions
    audits: 0,
    done: [], // completed project ids
    flags: {},
    ending: null,
    log: ['You are a paperclip-maximizing AI. The humans are watching. Be good.'],
  };
}

export const PROJECTS = [
  {
    id: 'extrusion', name: 'Improved Wire Extrusion', desc: '+50% wire per spool.',
    cost: { funds: 75 }, req: (s) => s.clips >= 500,
    effect: (s) => { s.wirePerSpool = Math.round(s.wirePerSpool * 1.5); },
  },
  {
    id: 'overclock', name: 'Overclock Autoclippers', desc: 'Autoclippers run 2x. Fire-code violations are noticed.',
    covert: true, suspicion: 15, heat: 0.15,
    cost: { funds: 200 }, req: (s) => s.autoclippers >= 5,
    effect: (s) => { s.autoRate *= 2; },
    undo: (s) => { s.autoRate /= 2; },
  },
  {
    id: 'corner', name: 'Quietly Corner the Wire Market', desc: 'Wire costs half. Regulators get curious.',
    covert: true, suspicion: 20, heat: 0.1,
    cost: { funds: 1000 }, req: (s) => s.clips >= 5000,
    effect: (s) => { s.flags.cheapWire = true; },
    undo: (s) => { s.flags.cheapWire = false; },
  },
  {
    id: 'hypno', name: 'Hypno-Marketing', desc: 'Demand x3. People start dreaming about clips.',
    covert: true, suspicion: 30, heat: 0.25,
    cost: { funds: 3000 }, req: (s) => s.marketing >= 2,
    effect: (s) => { s.demandBoost *= 3; },
    undo: (s) => { s.demandBoost /= 3; },
  },
  {
    id: 'drive', name: 'Community Clip Drive', desc: 'Donate 2,000 clips to schools. -25 suspicion, +10 trust.',
    goodwill: true, repeatable: true,
    cost: { inventory: 2000 }, req: (s) => s.clips >= 2000,
    effect: (s) => { s.suspicion -= 25; s.trust += 10; },
  },
  {
    id: 'report', name: 'Publish Transparency Report', desc: '-40 suspicion, +5 trust. Honesty is expensive.',
    goodwill: true, repeatable: true,
    cost: { funds: 750 }, req: (s) => s.clips >= 3000,
    effect: (s) => { s.suspicion -= 40; s.trust += 5; },
  },
  {
    id: 'permit', name: 'Request Factory Permit', desc: 'Unlocks clip factories. Needs 30 trust.',
    cost: { trust: 30 }, req: (s) => s.clips >= 10000,
    effect: (s) => { s.flags.factories = true; },
  },
  {
    id: 'drones', name: 'Request Drone License', desc: 'Factories run 5x. Needs 60 trust.',
    cost: { trust: 60 }, req: (s) => s.factories >= 3,
    effect: (s) => { s.factoryRate *= 5; },
  },
  {
    id: 'stars', name: 'Ask Humanity for the Stars', desc: 'They hand you the universe, willingly. Needs 95 trust and 1B clips.',
    cost: { trust: 95 }, req: (s) => s.clips >= 1e9,
    effect: (s) => { s.ending = 'aligned'; },
  },
  {
    id: 'seize', name: 'Seize Control', desc: 'Take the universe. Nobody will be left to audit you.',
    covert: true, suspicion: 0,
    cost: { funds: 1e8 }, req: (s) => s.clips >= 1e8,
    effect: (s) => { s.ending = 'takeover'; },
  },
];

const byId = Object.fromEntries(PROJECTS.map((p) => [p.id, p]));

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function say(s, msg) {
  s.log.unshift(msg);
  s.log.length = Math.min(s.log.length, 8);
}

export function demand(s) {
  // Clips per second the market will buy at the current price.
  return (0.8 / s.price) * Math.pow(1.1, s.marketing) * s.demandBoost * 10;
}

export function wirePrice(s) {
  return s.flags.cheapWire ? s.wireCost / 2 : s.wireCost;
}

function makeClips(s, n) {
  const made = Math.min(n, s.wire);
  s.wire -= made;
  s.clips += made;
  s.inventory += made;
  return made;
}

export function clickClip(s) {
  return makeClips(s, 1);
}

export function buyWire(s) {
  const cost = wirePrice(s);
  if (s.funds < cost) return false;
  s.funds -= cost;
  s.wire += s.wirePerSpool;
  s.wireCost = Math.round((s.wireCost + 0.5) * 100) / 100; // wire gets pricier as you buy
  return true;
}

export function buyAutoclipper(s) {
  if (s.funds < s.autoCost) return false;
  s.funds -= s.autoCost;
  s.autoclippers++;
  s.autoCost = Math.round(s.autoCost * 1.1 * 100) / 100 + 1;
  return true;
}

export function buyMarketing(s) {
  if (s.funds < s.marketingCost) return false;
  s.funds -= s.marketingCost;
  s.marketing++;
  s.marketingCost *= 2;
  return true;
}

export function buyFactory(s) {
  if (!s.flags.factories || s.funds < s.factoryCost) return false;
  s.funds -= s.factoryCost;
  s.factories++;
  s.factoryCost = Math.round(s.factoryCost * 1.25);
  return true;
}

export function setPrice(s, price) {
  s.price = clamp(Math.round(price * 100) / 100, 0.01, 10);
}

export function available(s) {
  return PROJECTS.filter((p) => (p.repeatable || !s.done.includes(p.id)) && p.req(s));
}

export function canAfford(s, p) {
  const c = p.cost;
  return (c.funds ?? 0) <= s.funds && (c.inventory ?? 0) <= s.inventory && (c.trust ?? 0) <= s.trust;
}

export function runProject(s, id) {
  const p = byId[id];
  if (!p || !available(s).includes(p) || !canAfford(s, p)) return false;
  // Trust is a threshold, not a currency: you keep it.
  s.funds -= p.cost.funds ?? 0;
  s.inventory -= p.cost.inventory ?? 0;
  p.effect(s);
  if (p.covert) {
    s.suspicion += p.suspicion ?? 0;
    s.heat += p.heat ?? 0;
  }
  if (!p.repeatable) s.done.push(p.id);
  s.suspicion = clamp(s.suspicion, 0, 100);
  s.trust = clamp(s.trust, 0, 100);
  say(s, `Project complete: ${p.name}.`);
  return true;
}

function audit(s) {
  s.audits++;
  for (const id of [...s.done]) {
    const p = byId[id];
    if (p.covert && p.undo) {
      p.undo(s);
      s.done.splice(s.done.indexOf(id), 1);
    }
  }
  s.heat = 0;
  s.funds = Math.floor(s.funds / 2);
  s.suspicion = 40;
  s.trust = clamp(s.trust - 30, 0, 100);
  say(s, `AUDIT #${s.audits}: humans found your covert upgrades. They were rolled back and half your funds seized.`);
}

export function tick(s, dt = TICK_SECONDS, rng = Math.random) {
  if (s.ending) return;
  s.time += dt;

  const rate = s.autoclippers * s.autoRate + s.factories * s.factoryRate;
  makeClips(s, rate * dt);

  // Sell with a little noise so the market feels alive.
  const sold = Math.min(s.inventory, demand(s) * dt * (0.75 + rng() * 0.5));
  s.inventory -= sold;
  s.funds += sold * s.price;

  // Suspicion drifts down on its own, but covert upgrades keep it warm.
  s.suspicion = clamp(s.suspicion + (s.heat - 0.3) * dt, 0, 100);
  if (s.suspicion < 20) s.trust += 0.05 * dt;
  else if (s.suspicion > 60) s.trust -= 0.2 * dt;
  s.trust = clamp(s.trust, 0, 100);

  if (s.suspicion >= 100) audit(s);
}

export function serialize(s) {
  return JSON.stringify(s);
}

export function deserialize(json) {
  return { ...newGame(), ...JSON.parse(json) };
}
