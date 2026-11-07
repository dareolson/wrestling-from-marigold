# For Opus: code structure and roster bloat (Derek asked you to think on it)

2026-11-07 · Sonnet, from a chat with Derek · Docs only, no runtime edits. Source read at `1adfc00`. Derek will return after you've considered it.

## Decisions already made by Derek

- Do NOT fast-forward `master` to story. Master stays as the last stable point; story keeps developing on `story/marigold-opening`. PLAN_CLEANUP T3.3 is struck through accordingly. T3.1/T3.2 (push, delete side branch) are unchanged and still yours.
- Agreed one-way rule: story code may import from the match engine; the engine must never import from story. Proposed home: `src/story/`. Not yet written into CLAUDE.md and no placeholder made. Your call whether to add the rule line, a placeholder, and a small grep test for violations.

## Why not split story from match now

Story scenes are small (`FrontDoor.js` 248 lines, `TitleStreet.js` 167); `main.js` already picks scenes. The weight is the shared engine (`Wrestler.js` 4148, `Skeleton.js` 3323, `animation/clips/` ~6200), which story will need for cutscenes and fights. A hard wall would mean duplicating it or building an interface with no current consumer. Revisit if: story gets its own save state or progression (give it its own module early); a match must run inside a story beat; test/build time becomes a problem.

## Bloat findings (Derek plans 3-4x the roster)

Scales fine: character files (~200-300 lines each, mostly data); move clips are shared across rigs with per-rig adjustments (`farLegOverTorso`, `legScale`); the engine grows with mechanics, not wrestlers.

Real risks, in order:

1. **`src/scenes/Arena.js` (4355 lines)** holds a hand-written `PRESETS` block per character (around line 3010-3045) plus the `CHARACTERS` list (line 42) and per-rig imports (lines ~15-16). Each new wrestler adds a block to this central file. Proposed fix: build presets from each character file (rig, textures, idlePose, begsOff, struts, sellStyle, personality, moveSet, colours), so a new wrestler is one new file plus one list entry. Keep the existing construction-time move-ID validation.
2. **`Wrestler.js` finisher special cases**: `theszPress` is hardcoded at lines ~2177 and ~3220. A branch per finisher per wrestler will bloat it. Proposed: a `finisherId` and table lookup, designed before PLAN_FINISHERS builds the press set piece.
3. **Move count**, not wrestler count, is the main growth driver. Clips are independent files today; keep it that way.
4. **Old rigs** (`thesz`, `thesz-front3q-r1`, `george`) still load via `CHARACTERS`. Derek's rule says ignore them; noted only as noise. Not a request to retire.
5. **Assets**: `src/assets` is 41 MB; each rig is 0.5-0.9 MB. A 12-wrestler roster is ~100 MB+ in git and the browser, and Derek's disk is 228 GB. The cleanup plan's PSD commit adds more. Worth an asset budget or a look at texture size before the roster grows.

Not recommended: splitting `Wrestler.js`/`Skeleton.js` just for line count (regression risk to approved move work); separate packages or repos.

## Proposed task for you to plan (not started)

"Data-driven roster presets": move per-character blocks out of `Arena.js` into the character files, drive `PRESETS` and `CHARACTERS` from one registry (`src/characters/rosterKits.js` already exists and may be the natural home). Needs: tests that every rig key still resolves with identical preset values (snapshot the current `PRESETS` before and compare after), `?p1=<rig key>` links unchanged, Lou fixture check afterward (memory: verify Lou after each session). This touches `Arena.js`, so Sonnet should execute only after your review; Derek judges any visual result.

Open questions for you: does this go before or after PLAN_FALLS G4b and PLAN_CLEANUP? Does the finisher table belong in this task or in PLAN_FINISHERS? Should the asset-size concern become a cleanup task?

## Codex response (2026-11-07)

Derek requested a critical follow-up. [Full assumption-by-assumption review for Opus](2026-11-07-codex-structure-efficiency-review-for-opus.md). Main corrections: story already persists stage/decisions; the 100 MB roster projection conflates storage/download/decoded memory; preserve `rosterKits.js` as the kit authority and keep handwritten presets out of generated rig files. Support a narrow composition registry and deferring broad engine splits; finisher dispatch belongs in F1.1. Fresh kit/back-waist checks 12/12 pass. No runtime changes.
