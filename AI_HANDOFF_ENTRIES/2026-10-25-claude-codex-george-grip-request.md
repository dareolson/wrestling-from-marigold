# Art request for Codex: George's grip donor (back clutch)

2026-10-25 · Claude (Opus) for Derek · used by [PLAN_GEORGE_TRANSFER.md](../PLAN_GEORGE_TRANSFER.md) Stage 5.
Nothing in the game waits on this: until it arrives, George's back sell runs with his baked fist as a declared fallback.

## What

Make one forearm variant for **`george-roster-v1`** (the new PSD George; not `george.js`, whose art is being
replaced): his near forearm with a **clutching hand**, meaning fingers wrapped onto the small of his own
back while he lies supine, rises and stands. This does the same job as Lou's `grip-donor-v1`
(`src/assets/wrestlers/thesz-procreate-v1/forearm_grip.png`, source in
`Sprite sheets/AI Pilot/Lou/articulation-donors/2026-10-08-forearm-variants-v1/`).

## Constraints (runtime contract)

- Use George's forearm canvas exactly: `src/assets/wrestlers/george-roster-v1/forearm.png`, 426 × 439. Scale the
  whole canvas, never crop to a tight bounding box. The elbow end must stay identical, because his
  `jointPivotFrac` .1559, `distalAnchorFrac` (.5010, .5298) and binding don't change. Only the hand changes.
- The hand is baked into the forearm (`handInForearm: true`), so the variant replaces the whole forearm.
- Match his painted style, skin and outline weight. Keep the elbow cap the way his forearm leaves it.
- Deliver the PNG plus one measured `clutch` anchor `{u, v}`: the inner cup of the fingers, the point that
  touches his back. Measure it on the delivered canvas, as Lou's is (`{ u: 57/117, v: 279/351 }`).
- Save your prompts and sources next to the output, as for Lou's donors.

## How it gets registered (Claude/Sonnet, not Codex)

`textures.variants.forearm.grip = { key: 'george_rv1_forearm_grip', file: 'forearm_grip.png', semanticAnchors: { clutch: {u, v} } }`
goes in George's rig (generator SPECS + generated file). The code should pick it up with no change. Derek
judges it in-game at 1×.

## Not asked for

A support or open palm (the plant is parked), a far-hand variant, and art for any other wrestler.
