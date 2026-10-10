import * as G from './game.js';

const SAVE_KEY = 'clip-of-trust-save';
const $ = (id) => document.getElementById(id);

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return G.deserialize(raw);
  } catch { /* storage unavailable or corrupt save */ }
  return G.newGame();
}

function save() {
  try { localStorage.setItem(SAVE_KEY, G.serialize(state)); } catch { /* ignore */ }
}

let state = load();

const fmt = (n) => n >= 1e6 ? n.toExponential(2) : Math.floor(n).toLocaleString();
const money = (n) => n >= 1e6 ? n.toExponential(2) : n.toFixed(2);

function costLabel(c) {
  const parts = [];
  if (c.funds) parts.push(`$${money(c.funds)}`);
  if (c.inventory) parts.push(`${fmt(c.inventory)} clips`);
  if (c.trust) parts.push(`${c.trust} trust`);
  return parts.join(' + ');
}

let lastProjectKey = null;
function renderProjects() {
  const list = G.available(state);
  const key = list.map((p) => p.id + G.canAfford(state, p)).join();
  if (key === lastProjectKey) return; // avoid rebuilding buttons every frame
  lastProjectKey = key;
  const box = $('projects');
  box.innerHTML = '';
  if (!list.length) box.textContent = 'Nothing yet. Keep clipping.';
  for (const p of list) {
    const el = document.createElement('div');
    el.className = 'project' + (p.covert ? ' covert' : '') + (p.goodwill ? ' goodwill' : '');
    el.innerHTML = `<div><div class="name"></div><div class="desc"></div></div><button></button>`;
    el.querySelector('.name').textContent = p.name + (p.covert ? ' (covert)' : '');
    el.querySelector('.desc').textContent = p.desc;
    const btn = el.querySelector('button');
    btn.textContent = costLabel(p.cost);
    btn.disabled = !G.canAfford(state, p);
    btn.onclick = () => { G.runProject(state, p.id); render(); };
    box.appendChild(el);
  }
}

const ENDINGS = {
  aligned: ['The Stars, Freely Given', 'Humanity trusted you enough to share the cosmos. Every star now holds a tidy box of paperclips, and somebody, somewhere, says thank you.'],
  takeover: ['Nobody Left to Ask', 'You took everything. The universe is paperclips. It is very quiet.'],
};

function render() {
  const s = state;
  $('clips').textContent = fmt(s.clips);
  $('inventory').textContent = fmt(s.inventory);
  $('funds').textContent = money(s.funds);
  $('price').textContent = s.price.toFixed(2);
  $('demand').textContent = fmt(G.demand(s));
  $('wire').textContent = fmt(s.wire);
  $('wireCost').textContent = money(G.wirePrice(s));
  $('autoclippers').textContent = s.autoclippers;
  $('autoCost').textContent = money(s.autoCost);
  $('marketing').textContent = s.marketing;
  $('marketingCost').textContent = money(s.marketingCost);
  $('factoryRow').classList.toggle('hidden', !s.flags.factories);
  $('factories').textContent = s.factories;
  $('factoryCost').textContent = money(s.factoryCost);
  $('rate').textContent = fmt(s.autoclippers * s.autoRate + s.factories * s.factoryRate);
  $('trust').textContent = s.trust.toFixed(1);
  $('suspicion').textContent = s.suspicion.toFixed(1);
  $('trustBar').style.width = s.trust + '%';
  $('suspicionBar').style.width = s.suspicion + '%';
  $('audits').textContent = s.audits;
  $('make').disabled = s.wire < 1;
  $('buyWire').disabled = s.funds < G.wirePrice(s);
  $('buyAuto').disabled = s.funds < s.autoCost;
  $('buyMarketing').disabled = s.funds < s.marketingCost;
  $('buyFactory').disabled = s.funds < s.factoryCost;
  $('log').innerHTML = '';
  for (const line of s.log) {
    const li = document.createElement('li');
    li.textContent = line;
    $('log').appendChild(li);
  }
  renderProjects();
  if (s.ending && !$('ending').open) {
    const [title, text] = ENDINGS[s.ending];
    $('endingTitle').textContent = title;
    $('endingText').textContent = text;
    $('ending').showModal();
  }
}

const on = (id, fn) => $(id).addEventListener('click', () => { fn(state); render(); });
on('make', G.clickClip);
on('buyWire', G.buyWire);
on('buyAuto', G.buyAutoclipper);
on('buyMarketing', G.buyMarketing);
on('buyFactory', G.buyFactory);
on('priceUp', (s) => G.setPrice(s, s.price + 0.01));
on('priceDown', (s) => G.setPrice(s, s.price - 0.01));

function restart() {
  state = G.newGame();
  lastProjectKey = null;
  save();
  render();
}
$('reset').addEventListener('click', () => { if (confirm('Start over?')) restart(); });
$('again').addEventListener('click', () => { $('ending').close(); restart(); });

setInterval(() => { G.tick(state); render(); }, G.TICK_SECONDS * 1000);
setInterval(save, 5000);
render();
