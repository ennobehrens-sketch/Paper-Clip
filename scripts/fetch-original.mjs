// Downloads the original Universal Paperclips web source into .original/ (git-ignored).
// It is used only as a local reference and by tests/differential.test.ts; it is not part of this project.
import { mkdir, writeFile } from 'node:fs/promises';

const BASE = 'https://www.decisionproblem.com/paperclips/';
const FILES = ['index2.html', 'globals.js', 'projects.js', 'main.js', 'combat.js', 'interface.css'];

await mkdir('.original', { recursive: true });
for (const f of FILES) {
  const res = await fetch(BASE + f);
  if (!res.ok) throw new Error(`${f}: HTTP ${res.status}`);
  await writeFile(`.original/${f}`, await res.text());
  console.log('fetched', f);
}
