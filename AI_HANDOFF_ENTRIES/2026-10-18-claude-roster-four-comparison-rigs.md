# Roster comparison rigs for all four PSDs

2026-10-18 · Claude · Derek asked for the roster work after Codex's extraction.
Nothing shipped or defaulted changed. Nothing committed or pushed. (Status at end of session; see "Next session".)

## Open them

Tuner: `http://127.0.0.1:5173/tools/rig-tuner/?char=<id>`
Match: `http://127.0.0.1:5173/?arena=1&notitle=1&p1=<id>&p2=george`

| id | source PSD | generator |
| --- | --- | --- |
| `thesz-roster-v1` | LouNew | `tools/wrestler-cutter/prepare-lou-roster.py` (Codex's, extended) |
| `george-roster-v1` | GeorgeNew | `tools/wrestler-cutter/prepare-roster-character.py george` |
| `kowalski-roster-v1` | Killer_Kowalski | `... prepare-roster-character.py kowalski` |
| `guido-roster-v1` | GuidoNew | `... prepare-roster-character.py guido` |

Configs: `src/characters/<name>_roster_v1.js`. Parts: `src/assets/wrestlers/<id>/`.
Per-character evidence: `Sprite sheets/RosterNew/2026-10-18/<dir>/extracted-v1/cleaned-v1/comparison-v1/`
(`measurements.json`, `proof/` tuner JSON, screenshots, certify log, live match).

## Derek's two corrections this session

1. **Use all the back legs.** I first shared one thigh/shin pair for both sides.
   Each character now has the front leg as the shared near family and the back
   leg as `farThigh` / `farShin`. This needed `far_thigh.png` in
   `BASE_PART_FILES` (`src/rig/partVariants.js`); the Skeleton already supported
   `textures.farThigh`. `tests/candidateRigMapping.test.js` encoded "no filename
   for split thighs" and was updated: `far_thigh` now maps, `near_thigh` still
   uses the shared slot.
2. **Calves stack below thighs; keep the calf's top stroke.** `shinUnderThigh:
   true` on all four. Verified live: shin depth 10.00299 vs thigh 10.003. Art is
   uncropped, so the stroke shows whenever the knee bends.

## Which leg is "back"

PSD layer names (A/B, L/R) are not anatomical. I identified the front leg by
which thigh paints on top in the PSD's own composite (exact pixel match):
`thigh_b` for George/Kowalski/Guido, `right_thigh` for Lou. The other is the back
leg. Thigh to shin pairing came from measured overlap.

## Verification (all under Node 22)

- `npm test` 703/703 (after the later refinements; 698 before), `npm run build` OK, `npm run rig:validate` all valid.
- Tuner idle + 24-phase walk, both facings, 50 samples per character: zero page
  errors, max elbow/knee ink gap 0, max uncovered core 0.
- Strict participation proof: maxGap 0, uncovered core 0 for all six characters;
  handoff anchor error 1.687px is IDENTICAL to current George and current Lou, so
  it is pre-existing, not a regression. Do not read it as a pass.
- Certifier: all four UNVERIFIED (no boot attachment slots; no recorded get-up
  budget). Same as Codex's Lou result. No permissive budget added.
- Real AI matches played with no non-finite samples, no missing textures, no page
  errors (see each `proof/live-match/REPORT.md`).

## Later in the session: George and Kowalski refinements

Derek reviewed George and Kowalski in the tuner/match and asked for these; both
now share them. Each is an opt-in `textures` flag written by the generator, so
shipped George, Lou and Guido are unaffected.

- **`kneeLift` (22 source px, generator-only):** the shin pivot sits 22px up the
  shin painting. Fixes the shin's top corner poking out past the thigh when the
  knee bends. Override with `KNEELIFT=<n>` when running the generator. Heights
  were re-matched afterwards (George 1.01201, Kowalski 0.94296).
- **`forearmOverUpperArm`:** forearm draws over its upper arm, both arms
  (matches the PSD). Default rig order remains upper arm over forearm.
- **`farLegOverTorso`:** far/back leg draws over the torso and trunk base
  (depth base+0.0027), still under the near leg (0.003) and the near arm. Far arm
  still tucks behind the far thigh.
- **Back shoulder moved back 40px** (George `[1255,425]`, Kowalski `[520,355]`),
  a first guess; tune in the tuner if needed.
- `tests/armStacking.test.js` pins the default arm order and both opt-ins
  (703/703 passing). `Skeleton.js` owns all of this (`setDepth`).
- Derek's unexported George shoulder tweak from the tuner is session-only and was
  not captured. If it mattered, he must re-export it.

## Next session (Derek: "finish the roster of four")

1. **Apply the same treatments to Guido and Lou** if Derek wants them matched:
   add `kneeLift=KNEELIFT, forearmOverUpperArm=True, farLegOverTorso=True` and a
   moved back shoulder to the `guido` spec in `prepare-roster-character.py`; Lou's
   generator `prepare-lou-roster.py` needs the same (it has no kneeLift/flags yet).
   Re-match heights after the knee lift (it shortens the figure ~0.7%).
2. Derek tunes landmarks in the tuner; fold his exports into the specs.
3. Decide Kowalski/Guido real heights, move sets and colours (all placeholders).
4. Guido needs an untaped forearm.
5. Then Derek's visual approval before anything replaces shipped art; commit
   (nothing from this work is committed yet; do not mix with the unrelated story work
   in the tree).
6. Derek resumes move refinement after the roster; see the older entries.

## Open items for Derek

- **MANUAL landmarks**: shoulders, wrists, anatomical ankles and soles were read
  off gridded renders. Tuner review is the real test.
- **Placeholder scales**: Kowalski is matched to Lou's height, Guido to George's.
  Kowalski should likely be taller, Guido more compact. Tell me the ratios.
- **Guido**: only the taped forearm exists, so BOTH wrists show tape. Needs an
  untaped counterpart (donor or new art) before this is canon-correct.
- **Kowalski/Guido kit**: they borrow Lou's / George's moveSet and idle pose as a
  neutral control; the Arena presets use placeholder skin/trunk colours.
- Elbow: the upper arm's rounded bottom outline reads as a faint cuff at the
  bent elbow on George. It is Derek's paint; flagging, not altering.
- `Sprite sheets/` is git-ignored: the PSDs and extractions are not backed up by
  committing this work. Derived crops under `src/assets/wrestlers/` are.
