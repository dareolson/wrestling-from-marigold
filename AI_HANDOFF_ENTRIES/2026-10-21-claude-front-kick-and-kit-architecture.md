# Front kick, explicit roster kits, and move-selection gaps (2026-10-21)

Claude, first batch of the shared move library. Local only; nothing pushed.

## Verified gaps

1. **Borrowed kits and personalities.** `kowalski_roster_v1.js` takes
   `thesz.moveSet`/`sellStyle`; `guido_roster_v1.js` takes `george.*`. `Arena.js`
   gave Kowalski the `thesz` AI personality and Guido `george`. Confirmed.
2. **Fixed power-button priority.** `resolvePowerMove` is a fixed chain:
   headbutt > elbowDrop > jab (<=85) > dropkick (<=220). A new strike at jab or
   medium range is shadowed by whichever is earlier in the chain *and in the
   kit*. Directional overrides (`kneeLift` up, `kneeDrop` down) live in
   `Wrestler.tryPower` ahead of the chain, which is why they work.
3. **AI is hand-coded per move.** `AIHandler._chooseAction` names each move;
   a kit move with no branch is never thrown by the AI.
4. Generated roster files get overwritten by `prepare-roster-character.py`, so
   kit decisions cannot live there.

## What changed

- `frontKick`: clip `src/animation/clips/frontKick.js` (generator
  `tools/move-editor/author_frontkick.mjs`, draft `drafts/frontKick.json`),
  registry entry, `STAMINA_DRAIN.frontKick = 7`, executor `Wrestler._doFrontKick`.
  Player access: **hold Down + Power** vs a standing/blocking target within 130
  units (a directional override, so no default strike shadows it). Attacker
  settles to an 84-unit standoff so the boot meets the belly at any legal range;
  damage, sell (chest 0.5), stagger and a 28-unit push-back fire on the single
  impact frame, only if the target is still within 115 units. Evade dodges it.
- `src/characters/rosterKits.js`: explicit per-wrestler kits, outside the
  generated files. Kowalski and Guido = their borrowed base + `frontKick`. Lou
  and George unchanged.
- `AIHandler`: new `kowalski` and `guido` personalities (spread from
  thesz/brawler plus overrides) and `frontKickOdds` branches at jab range and a
  stride away. **All numbers are first-draft placeholders**; the identities
  are the proposed ones, not Derek's decision.
- `tools/move-critic/specs.mjs` `frontKick` spec; `tools/debug/play.mjs`
  scenarios `frontKick` (P1, faces right) and `frontKickP2` (P2, faces left);
  `tests/frontKick.test.js`; `tests/moveRegistry.test.js` orphan check now
  counts the roster kits.

## Validation

- `npm test`: 716 pass, 0 fail. `npm run build` ok.
- Critic (authoring preview, Lou vs George): impact gap 5.6% of body height
  (bar: 8%), 0 pops, 0 floor penetration. Foot slide 5.4% in the last 0.06 s
  (the re-plant); worth a look.
- Real match, both facings (kowalski-roster-v1 vs guido-roster-v1 and
  reversed): impact once, defender selling -> staggered -> standing, pushed
  ~31 px, attacker settles 562 vs the 562 target.
- `play.mjs all`: 29 PASS, 0 FAIL (includes both new front-kick scenarios). `move_participation_proof.mjs` ran clean (no maxGap line printed; ink=0 on all casts).

## Visual concerns for Codex / Derek

- The boot draws *over* the defender's belly (3/4 view layering) rather than
  denting it. Layer order at contact is a candidate for a cross-actor fix.
- At full stamina the defender's stagger is a small rock, so the kick reads as
  "pushed", not "hurt". That is the stagger library, not this move.
- Idle hands sit low (shared idle); no pop, but the guard looks slack.
- Only checked Procreate-era Lou vs George in the editor and the two roster
  rigs in match; not yet size-mismatch pairs (Guido vs Kowalski is the only
  size difference seen).
- Impact foley uses `crowd.impact('kick', 0.7)`; not auditioned.

## Next steps (suggested)

1. Derek: confirm or change the Kowalski/Guido identities and kits.
2. Move selection: replace the fixed `resolvePowerMove` chain with a per-wrestler
   slot table (`close`, `mid`, with the kit choosing which move fills each),
   keeping directional overrides. Do this when a second close/mid strike lands,
   so the slot shape is driven by two real moves.
3. AI: move per-move branches to data (`aiUse` weights per situation on the
   personality) once there are ~4 new moves.
4. Second move: clubbing forearm or shove (Bret 109-114), reusing this pattern.
