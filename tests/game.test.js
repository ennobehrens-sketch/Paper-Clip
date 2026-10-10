import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/game.js';

const still = () => 0.5; // rng with no noise

test('clicking makes a clip and uses wire', () => {
  const s = G.newGame();
  G.clickClip(s);
  assert.equal(s.clips, 1);
  assert.equal(s.inventory, 1);
  assert.equal(s.wire, 999);
});

test('no wire, no clips', () => {
  const s = G.newGame();
  s.wire = 0;
  assert.equal(G.clickClip(s), 0);
  assert.equal(s.clips, 0);
});

test('selling turns inventory into funds', () => {
  const s = G.newGame();
  s.inventory = 100;
  G.tick(s, 1, still);
  assert.ok(s.inventory < 100);
  assert.ok(s.funds > 0);
});

test('autoclippers produce over time', () => {
  const s = G.newGame();
  s.funds = 100;
  G.buyAutoclipper(s);
  G.tick(s, 10, still);
  assert.equal(s.clips, 10);
});

test('covert projects raise suspicion and heat', () => {
  const s = G.newGame();
  s.autoclippers = 5;
  s.funds = 500;
  assert.ok(G.runProject(s, 'overclock'));
  assert.equal(s.suspicion, 15);
  assert.equal(s.autoRate, 2);
  assert.ok(s.heat > 0);
});

test('reaching 100 suspicion triggers an audit that rolls back covert upgrades', () => {
  const s = G.newGame();
  s.autoclippers = 5;
  s.funds = 500;
  G.runProject(s, 'overclock');
  s.funds = 1000;
  s.trust = 50;
  s.suspicion = 99.9;
  s.heat = 1; // enough to climb past the natural decay
  G.tick(s, 1, still);
  assert.equal(s.audits, 1);
  assert.equal(s.autoRate, 1);
  assert.ok(!s.done.includes('overclock'));
  assert.equal(s.suspicion, 40);
  assert.ok(Math.abs(s.trust - 19.8) < 1e-9); // -0.2 drift from high suspicion, then -30
});

test('goodwill lowers suspicion and raises trust, and can repeat', () => {
  const s = G.newGame();
  s.clips = 5000;
  s.inventory = 5000;
  s.suspicion = 50;
  assert.ok(G.runProject(s, 'drive'));
  assert.ok(G.runProject(s, 'drive'));
  assert.equal(s.suspicion, 0);
  assert.equal(s.trust, 30);
  assert.equal(s.inventory, 1000);
});

test('permits are gated on trust, which is not spent', () => {
  const s = G.newGame();
  s.clips = 10000;
  assert.equal(G.runProject(s, 'permit'), false);
  s.trust = 30;
  assert.ok(G.runProject(s, 'permit'));
  assert.equal(s.trust, 30);
  assert.ok(G.buyFactory(Object.assign(s, { funds: 1e6 })));
});

test('aligned ending', () => {
  const s = G.newGame();
  s.clips = 1e9;
  s.trust = 95;
  G.runProject(s, 'stars');
  assert.equal(s.ending, 'aligned');
});

test('save round-trips', () => {
  const s = G.newGame();
  s.clips = 42;
  assert.equal(G.deserialize(G.serialize(s)).clips, 42);
});
