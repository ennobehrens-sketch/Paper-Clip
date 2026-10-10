# Paperclip Foundry

A graphical remake of [Universal Paperclips](https://www.decisionproblem.com/paperclips/) by Frank Lantz:
the same game, rule for rule, with a top-down factory floor in the style of late-90s 2D strategy games.

Stage 1 is playable. See [docs/SPEC.md](docs/SPEC.md) for the design and plan.

```sh
npm install
npm run dev        # play at http://localhost:5173
npm test           # unit tests; the differential test needs the original source:
npm run fetch-original
```
