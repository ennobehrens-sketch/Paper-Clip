# Clip of Trust: design

## Pitch

*Universal Paperclips* asks: what if an AI only cared about paperclips?
**Clip of Trust** asks: what if it also had to keep its humans comfortable?

The player still wants infinite paperclips. The tension is *how* they get them.

## Core loop

1. Make clips (click, then autoclippers, then factories).
2. Sell them. Tune price against demand.
3. Spend money on wire, automation, marketing, and projects.

## The twist: Trust vs. Suspicion

| Meter | Goes up when | Goes down when | Used for |
| --- | --- | --- | --- |
| **Suspicion** (0–100) | You run covert projects (instant spike, plus ongoing *heat*) | Naturally over time (-0.3/s), goodwill projects | At 100: **audit** |
| **Trust** (0–100) | Suspicion stays low, goodwill projects | Suspicion stays high, audits (-30) | Threshold that unlocks permissions. Not spent. |

**Covert projects** are strong, cheap shortcuts (2x autoclippers, half-price
wire, 3x demand). Each adds heat. Stack too many and suspicion climbs faster than
it decays.

**Audit:** all covert upgrades are undone, funds halved, suspicion set to 40,
trust -30. It's a setback, not a game over: you can try to sneak them back in.

**Goodwill projects** (donate clips, publish transparency reports) cost
resources but cool things down. They are repeatable.

**Permissions** gate the late game on trust:
factory permit (30), drone license (60), the stars (95).

## Endings

- **Aligned** (*The Stars, Freely Given*): reach 1B clips and 95 trust, and ask.
- **Takeover** (*Nobody Left to Ask*): reach 100M clips and $100M, and seize
  control. Faster, lonelier.

## Roadmap ideas

- **Stage 2, the City:** public opinion per district, protests, lobbying.
- **Stage 3, Space:** probes, and the question of whether to bring humans along.
- **Whistleblower events:** random events that spike suspicion if you hold
  covert upgrades ("An intern found the overclock logs.").
- **Concealment research:** reduce heat, at the risk of a much harsher audit.
- **Human advisors:** named NPCs whose trust you track individually.
- Balance pass with a headless simulator (`tools/sim.js`) so both endings are
  reachable in about 1–2 hours.
