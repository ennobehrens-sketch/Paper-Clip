import { Stage1 } from './game/stage1';
import { clearSave, loadGame, saveGame } from './game/save';
import { Panels } from './ui/panels';
import { FactoryView } from './render/renderer';
import { applyDevSnapshot } from './dev';

const game = new Stage1();
const loaded = loadGame(game);
const params = new URLSearchParams(location.search);
const dev = params.get('dev');
if (dev) applyDevSnapshot(game, dev);

const view = new FactoryView(document.getElementById('view') as HTMLCanvasElement, game);
const panels = new Panels(game, { manualClip: () => view.manualClip() });
game.onAutoSave = () => { if (!dev) saveGame(game); };
game.onStageEnd = () => {
  if (!dev) saveGame(game);
  hypnoDroneEvent(() => { document.getElementById('stageEnd')!.hidden = false; });
};
if (loaded && game.humanFlag == 0) document.getElementById('stageEnd')!.hidden = false;
addEventListener('pagehide', () => { if (!dev) saveGame(game); });
document.addEventListener('visibilitychange', () => { if (document.hidden && !dev) saveGame(game); });

// Reset, with the confirmation built into the page.
const resetArea = document.getElementById('resetArea')!;
document.getElementById('btnReset')!.addEventListener('click', () => {
  resetArea.innerHTML = 'Erase all progress? <button class="link danger" id="resetYes" type="button">Yes, reset</button> <button class="link" id="resetNo" type="button">Cancel</button>';
  document.getElementById('resetYes')!.onclick = () => { clearSave(); game.onAutoSave = () => {}; location.reload(); };
  document.getElementById('resetNo')!.onclick = () => location.reload();
});

const camTag = document.getElementById('camTag')!;
let last = performance.now();
function loop(now: number): void {
  const dt = Math.min(0.25, Math.max(0, (now - last) / 1000));
  last = now;
  game.sched.advanceBy(dt * 1000);
  view.frame(dt);
  panels.update(dt);
  camTag.textContent = `camera ${view.cam.z.toFixed(2)}×`;
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
(window as any).__game = game;
(window as any).__ready = true;

/** The original's "Release the HypnoDrones" flash. */
function hypnoDroneEvent(done: () => void): void {
  const div = document.getElementById('hypnoDroneEventDiv')!;
  const text = document.getElementById('hypnoDroneText')!;
  let n = 0;
  text.textContent = 'Release';
  const id = setInterval(() => {
    n++;
    if (n > 5 && n < 10) text.innerHTML = 'Release';
    if (n > 30 && n < 40) text.innerHTML = '<br><br><br>Release';
    if (n > 45 && n < 55) text.innerHTML = '<br>Release';
    if (n > 55) text.innerHTML = 'Release<br>the<br>Hypno<br>Drones';
    if (n >= 120) { clearInterval(id); div.hidden = true; done(); return; }
    div.hidden = !div.hidden;
  }, 32);
}
