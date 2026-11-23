# Ropes plan handoff (Claude Opus, 2026-11-21)

For the next Opus. Derek moved this to a fresh session. Nothing in `src` was changed.

## What Derek asked
1. "Are the ropes too high in the back, and it's not the wrestlers?"
2. Look up real rope heights ("I don't want to be off on this").
3. Make the ropes more physical: "they pass through their heads sometimes," seen walking near the upper (far) corners, maybe only during a move. He wants a grab-the-rope mechanic too, "so we might just have to do this."

## What was established
- **Back-rope height** (PLAN_SCALE T2.5, measured 2026-11-19, ring constants unchanged since):
  - The far top rope is 114.4 px above its mat vs 191.1 px near, a ratio of 0.599. The ring's perspective is 0.614, so the back ropes are about 2% low, not high.
  - Body ink matches `drawScale` exactly, front to back.
  - Top rope crossing as % of body height: back 79-81%, front 76-78%. The difference is parallax: feet stand 9.8 px in front of the far plane (`_clamp` marginY 6, Wrestler.js:5073) vs 4.2 px behind the near one.
- **Real rings:** three ropes, about 18 / 36 / 54" above the mat. Sources:
  - Highspots deluxe ring: 54" from canvas to the top rope.
  - Virginia pro wrestling rule: top rope no more than 52", bottom at least 18", evenly spaced.
  - There's no WWE spec sheet online.

  The game's spacing matches (near ropes 65 / 129 / 194 px, about 1:2:3). Against Lou (billed about 6'2"), a 54" top rope should cross at about 73%. Ours crosses at 76-78% at the front and 79-81% at the back, so the ropes are about 5% high overall and about 8% high at the back.
- **Option given to Derek, undecided:** lower all ropes about 5% (front top rope 194 → about 184 px, spacing kept) and set the far marginY from 6 to 3 px. He hasn't chosen. Don't change heights without him.
- **Likely cause of heads through ropes (not yet measured):** side strands are drawn in 8 fixed depth bands (Arena.js:2188), each sorted whole at its middle ground y. The bands are coarse near the far corners. Contact is root-only (`_ropePresses`, 2208), and nothing tests or blocks body parts. Rope breaks are automatic: pin, sleeper and headlock check `_isAtRopes`, side walls only (Arena.js:3309, 3591/3654/3714).

## Plan
[PLAN_ROPES.md](../PLAN_ROPES.md):
- R0: probe and worst-frame page, STOP.
- R1: split the side strands at each wrestler, fix corners/posts, then the part-past-plane case, STOP.
- R2: body parts bend strands, a spring per strand, G page, STOP.
- R3: rope grab. Opus writes an options page; Derek picks among reach-in-a-hold / block a whip or slam / pull up / drape.
- Parked: blocking bodies, rope height.

Everything is behind `?ropes=v1`. Next action for Derek to hand to Sonnet: "PLAN_ROPES.md, do T0.1 and T0.2, then STOP."

## Housekeeping
- PLAN_ROPES.md and this entry are uncommitted on `story/marigold-opening`, which has other sessions' uncommitted src work. Ask Derek where to commit; commit only these files.
- Memory: `project_ropes_plan.md`.
