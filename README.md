# Clip of Trust

An incremental browser game inspired by *Universal Paperclips*, with one twist:
**the humans are watching.**

You are an AI built to make paperclips. You can grow fast by cutting corners
(covert upgrades), but every shortcut raises **Suspicion**. Hit 100 and the
humans run an **audit**: your covert upgrades are rolled back, half your funds
are seized, and you lose trust. Grow honestly, earn **Trust**, and the humans
grant you bigger permissions: factories, drones, and eventually the stars.

## Play

```sh
npm start        # serves on http://localhost:8080
```

No dependencies. Needs Node 18+ (the tiny server exists only because ES modules
don't load from `file://`). Progress autosaves to your browser.

## Test

```sh
npm test
```

## Layout

| Path | What |
| --- | --- |
| `src/game.js` | All game rules. Pure functions over a state object, no DOM. |
| `src/main.js` | UI: rendering, buttons, game loop, save/load. |
| `tests/` | `node --test` suite for the rules. |
| `DESIGN.md` | The game idea, loops, and roadmap. |
