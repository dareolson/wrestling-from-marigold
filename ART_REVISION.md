# Art revision: changing a wrestler's body art without losing the work on top of it

For: Derek, Claude, Sonnet, Codex. Use this whenever a PSD changes (knee or elbow overlap, trunks, a re-drawn limb) on a production rig.

## How a rig is built (2026-11-24)

| Layer | File | Who writes it |
| --- | --- | --- |
| PSD | `Sprite sheets/RosterNew/<date>/<Name>.psd` + `extracted-v1/` exports | Derek |
| Base parts | `src/assets/wrestlers/<rig>/{torso,upper_arm,forearm,thigh,shin,far_thigh,far_shin}.png` | the generator |
| Base geometry | `src/characters/generated/<rig>.base.js` (bone lengths, pivots, sockets, draw order, heightScale) | the generator. **Never edit.** |
| Authored layer | `src/characters/<rig>.js`: `{ ...BASE, variants, backSell, anchors, falls, head (Lou) }` | people |
| Variants | grip/chop/clasp/ready forearms, ankle twist, hair-fix arms...: PNGs on a base part's canvas | Codex / tools |

Generators: Lou `tools/wrestler-cutter/prepare-lou-base.py` (Lou2.psd); George/Kowalski/Guido `tools/wrestler-cutter/prepare-roster-character.py <george|kowalski|guido>`.

**Draw order comes from the PSD layer order.** Lou's generator reads it from the export's `LAYER_INVENTORY.md`: calves over thighs (`shinUnderThigh`), far leg over trunks (`farLegOverTorso`), forearm over upper arm. The roster generator still takes those three from its SPECS table; move it to the PSD order the next time one of those PSDs changes.

A variant drawn on a base canvas inherits that base's geometry. When the base is re-cut, the variant no longer sits on the new drawing. Step 3 fixes that.

## The procedure

1. **Derek** saves the edited PSD as a new dated copy (`Sprite sheets/RosterNew/<today>/`), keeping layer names. Export with `tools/wrestler-cutter/export-roster-psds.py --cleanup` (point the rig's generator SOURCE at the new folder).
2. `node tools/art/revise_rig.mjs <rig>`. In one command it:
   - snapshots the current art to `research/art-revisions/<date>-<rig>/old/`
   - runs the generator
   - builds `job.json` from every same-canvas variant and anchor
   - re-fits the variants with `tools/art/rebase_variants.py`
   - prints the new anchor values

   `--dry` runs it against unchanged art; it must report IoU 1.000 (checked on George 2026-11-24).
3. **Read the report.** `baseIoUFit` is how well the old base drawing lands on the new one: about 0.95 or more means the same drawing; under about 0.9 means a different drawing, so expect visible misses. `lostInkPx` above 0 means the variant got clipped. Make overlay sheets (new base + variant at 55%) and look.
4. **Joint-end edits:** when the knee or elbow end changed, a re-fitted variant brings back the OLD joint end. Add `"splice": {"v": <row frac>, "feather": px}` (or `"oldV"`, where the variant's repaint starts) to that variant in `job.json`, so it takes the new base above that row. Use it only where the variant and the base share the same contour there. If the variant's limb is a different width (Lou's grip donors), a splice doubles the contour, so leave it out and queue an art pass instead. Re-run `python3 tools/art/rebase_variants.py <dir>/job.json`.
5. Paste the printed anchors into `src/characters/<rig>.js`. Own-canvas art (projected arms such as headlockWrap and the chop sweeps) is listed as "not re-fitted". If heightScale changed, scale its `projectedArm.scaleX/Y` by old/new (Lou's file shows how: `KEEP_SIZE`).
6. Re-measure what was measured on the old body:
   - `node tools/rig/validate-character-rigs.mjs`
   - `npm test`
   - the height ladder: `WFM_URL=... node tools/debug/scale_height_ladder.mjs`, then re-pin `tests/heightLadder.test.js` / `tests/scaleDebug.test.js` and say why
   - the back-sell probes, if the rig has `backSell`: `tools/debug/hold_weight_sweep.mjs`, `recovery_probe.mjs`
   - `crownBelowHip` (piledriver crown contact)
7. **Derek judges:**
   - a both-facings move film (`tools/debug/lou_shelf_compare.mjs` shows the pattern: new vs shelved art, same moves)
   - a normal-speed loop strip

   Report measurements and misses, never "looks right".

## Shelving the previous art

Before a large change, freeze the old rig as `src/characters/<rig>_shelf.js`:
- copy the assets into `<rig>-shelf/`
- rename the texture keys
- set `assetRoot`
- add an Arena preset with `moveRig: '<rig>'`

See `thesz_procreate_shelf.js` (`?p1=thesz-procreate-shelf`). Shelves are not maintained.

## Log

| Date | Rig | What | Record |
| --- | --- | --- | --- |
| 2026-11-24 | thesz-procreate-v1 | Body from Lou2.psd; Procreate head kept; 17 variants re-fitted; old body shelved | `research/art-revisions/2026-11-24-lou/` |
