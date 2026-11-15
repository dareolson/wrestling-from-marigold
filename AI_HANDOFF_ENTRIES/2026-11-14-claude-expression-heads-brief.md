# Expression heads for every wrestler: Codex art brief (Claude, 2026-11-14)

Derek on George's expression heads: "it looks amazing, let's lock it in and do the same for each wrestler, it's way more fun now."
George's version is committed (79c07d4) and on by default (`?faces=0` turns it off).

## What exists (George)

- `research/art/george-expressions-2026-11-14/`: three 3x3 atlases (talk, pain, smug) and two worn resting heads, plus Codex's README.
- `register_cells.py` (same folder) cuts each cell, keeps the largest opaque blob and fits it to the rig's `head.png` canvas.
  - The fit is skin-overlap; mouth frames are locked to their row's closed frame.
  - Output goes to `src/assets/wrestlers/<rig>/expressions-trial/`.
- `src/animation/faceTrial.js` picks the frame. Adding a rig takes one `FACE_RIGS` entry.
- At rest: the rig's own head when clean, `rest_1` when disheveled, `rest_2` when battered.

## Lesson from George

The resting heads were drawn directly from `head.png`, and they match it almost exactly. The expression atlases were drawn from an earlier atlas. They drifted in face shape and came out slightly larger, so the face changes when he goes from rest into a reaction.
**Draw every image from the rig's own `head.png`, and draw each expression row from that row's resting head.**

## Codex: art for Lou, Guido, Kowalski

Rigs and their reference heads:
- Lou: `thesz-procreate-v1`, 197x241, the art bar.
- Guido: `guido-roster-v1`, 243x263.
- Kowalski: `kowalski-roster-v1`, 261x306.

Order per wrestler:
1. **Two resting heads,** referenced directly to `src/assets/wrestlers/<rig>/head.png`: disheveled (messy hair, flushed) and battered (bruise, cut, wrecked hair, restrained wear).
   - Keep the face, nose, jaw, eye and the original's closed-mouth expression.
   - Change only hair and wear.
2. **Three 3x3 atlases.** Rows are clean, disheveled, battered. Each row's reference is the original head (clean row) or that row's resting head.
   - `talk`: closed, speaking, shouting.
   - `pain`: flinch, clenched teeth, open-mouth cry.
   - `smug`: smirk, toothy grin, chuckle.
   **Personality (Derek 2026-11-14):** George stays the arrogant heel. Lou and Guido are babyfaces, and Kowalski ("Killer") is a monster heel. Same three slots and file names for everyone, so the code is unchanged. The `smug` slot plays after he lands a hit; `talk` plays while he stands over a downed man.
   - **Lou, Guido (babyface):**
     - `talk`: fired up, rallying the crowd: closed jaw-set, calling out, full-throated yell.
     - `pain`: open, honest selling.
     - `smug` slot: determined, never smug: a grim nod, a gritted fighting grin, a fired-up shout.
   - **Kowalski (monster heel):**
     - `talk`: a low growl and snarl: closed sneer, bared teeth, roar.
     - `pain`: grudging, more anger than hurt: grimace, clenched snarl, pained roar.
     - `smug` slot: menace: cold dead stare, wide-eyed sneer, a slow cruel grin.
3. **Format, as for George:**
   - Same profile angle, framing and neck cut as `head.png`.
   - Transparent background.
   - Nothing generated below the neck: no debris, no torso.
   - Equal cells.

Files go in `research/art/<name>-expressions-2026-11-<dd>/`:
- `<name>-expression-atlas-v1.png`, `<name>-pain-atlas-v1.png`, `<name>-smug-atlas-v1.png`
- `<name>-rest-disheveled-v1.png`, `<name>-rest-battered-v1.png`
- A README listing the generated originals.

Names are `lou`, `guido` and `kowalski`. Don't wire anything; Claude registers and wires.

**Optional, after the three:** George's three atlases again, each row drawn from his resting heads, to remove the drift.

## Claude, once the art lands

1. Run `python3 research/art/george-expressions-2026-11-14/register_cells.py <rig> <artDir> <name>` for each rig.
2. Check the `skinIoU` values in `registration.json`. The skin mask was tuned on George, so Lou's paler skin may need its thresholds widened.
3. Add a `FACE_RIGS` entry per rig, with that rig's head texture key as the clean rest.
4. Extend `tests/faceTrial.test.js`.
5. Do an on-body check per wrestler in both facings.
