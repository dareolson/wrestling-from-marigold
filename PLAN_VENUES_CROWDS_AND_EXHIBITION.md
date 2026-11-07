> **Visual direction, Derek 2026-10-31:** the entire game is monochrome, including story, carnival, televised matches, bar fight and exhibition. This supersedes earlier color presentation directions in this document. Preserve source masters; see [the production standard](CINEMATIC_ART_STANDARD.md). Current move work remains the priority.

# Venues, crowd recipes and replayable exhibition encounters

2026-10-31 · Codex, from Derek's direction. Planning and production scope; no new runtime system implemented here. Active grapple work remains separate.

## What Derek wants

Refresh the audience rather than keep the same recognizable faces at every show. Build reusable audiences with selection rules. Give the carnival a particular working-class neighborhood crowd. A convention-week match may have delegates, politicians and companions. Once the carnival appears in the story, make it available afterward in exhibition; additional venues can follow. The Guido/Guy bar fight should likewise become a playable exhibition encounter after the story version.

The carnival ring and opponent concepts exist in `research/art/carnival-opening-2026-10-31/`; story direction is in `STORY_CARNIVAL_OPENING.md`. They are not integrated gameplay. The approved Carl ringside sheet remains separately tracked.

## One encounter definition, shared by story and exhibition

Separate these small data concepts so adding a setting does not duplicate a game:

| Concept | Owns | Example |
| --- | --- | --- |
| Venue | Scenery, lights, ground/ring layout, reserved cast slots, audience placement regions | Marigold, carnival lot, outside the bar |
| Crowd recipe | Eligible art, weights, counts, arrangement, reactions and seed | Regular wrestling night, convention visitors, carnival neighborhood |
| Encounter | Mode/rules, participants, venue, crowd recipe and available options | Carnival challenge, normal Bobo match, five-man bar fight |
| Story completion / unlock ledger | Which finished encounters or venues exhibition may offer | Carnival completed; bar fight completed |

Story sequences call a shared encounter and consume its result. Exhibition launches that same implementation with story side effects disabled. Use stable IDs, not scene display names or array positions. Do not make Bobo a new rules mode merely because the audience changes.

Current seams: `FrontDoor.showTitle()` launches `Arena` directly for Exhibition. `Arena.preload()` loads `CROWD_EXTRAS`, named staff and `BACK_CROWD` unconditionally; `create()` constructs Marigold directly. Those are the narrow places to adapt. Avoid a duplicate Arena copy for each ring, or a generic framework spanning every future game mode before a second working venue exists.

## Crowd generator: compose approved art at runtime

This means seeded selection/placement of prepared sprites, not live AI image generation. New drawn people expand the catalog over time. The art tool can create sources during development; the shipped game only assembles approved assets.

Useful catalog fields: stable ID; suitable venues/themes; standing/seated; age group; costume group; seated/standing dimensions; native facing; animation frame keys; foot/seat anchor; allowable palette variants; maximum simultaneous instances; reaction set; whether anonymous or reserved named cast. Tags need not label every personal trait, and the generator must never infer a character's private relationship from appearance.

Recipe rules:

- Filter by theme and physical placement first: carnival standing people cannot fill a seated slot with the same coordinates.
- Set target count, broad costume/group proportions and per-design repetition caps. Author companion groups explicitly when needed, rather than scatter unrelated people into accidental pairings.
- Prevent identical adjacent foreground figures and excessive duplication across rows. Keep a recent-show history as an optional later improvement; a per-match seed already breaks fixed seating.
- Scale by row depth/declared body size and use shared anchors. Do not normalize each animated frame to its own height or width; raised arms must not shrink the body.
- Reserve named cast/staff slots first. Carl stays attached to Guy; he is never selected as anonymous filler or multiplied through a recipe. Determine venue-appropriate staff rather than automatically putting the Marigold announcer, police and Lewis at a carnival.
- Bound placement attempts. If constraints cannot be met, reduce density or use an approved eligible fallback, report the shortfall in dev tools, and never hang or silently insert an unsuitable person.
- Use a dedicated seeded RNG for crowd selection and reaction timing. Never consume the global combat RNG: changing the audience must not change AI decisions or match results.
- Offset animation timing and vary reaction choices. Clothing can vary safely within authored palettes, but do not recolor skin globally or replace distinct art with arbitrary hue shifts.
- Freeze the chosen manifest for the match so row rebuilds or camera effects do not reshuffle the crowd mid-show. Store/log seed and selection for reproducible screenshots.

### Initial audiences

**Carnival neighborhood:** four to six new foreground archetypes to start: work-shirt laborer, tired older regular, young couple, parent with child, teenager, skeptical onlooker. Sparse standing groups with elbow room, ordinary summer clothes, simple booths and localized chatter. Reuse eligible existing figures only if they fit. Small attendance is part of the venue's character, not a defect to fill with clones.

**Convention visitors:** delegates with badges, summer suits, fashionable companions, businessmen, reporters, reserved groups. A fictional Bobo booking is a possible story tie-in, not a confirmed match/date. Character relationships such as wives/mistresses need written interactions if significant; wardrobe alone does not establish them. Convention audience composition does not automatically imply unanimous support for a wrestler.

**Regular Marigold refresh:** widen the eligible anonymous pool and vary foreground selections while preserving deliberate named cast. Retain the current seating as a legacy recipe for comparison rather than destroy existing art or overwrite approved placement blindly.

## Memory and download discipline

Measured audience source folder during this discussion: 164 PNGs, 18.25 MiB compressed, approximately 42.45 MiB RGBA pixel data before runtime/GPU overhead. This includes ringside staff. It is an inventory estimate, not measured whole-game memory.

Resolve venue + recipe before preloading and load only selected art and required animations. Track which texture keys are shared and release unused venue-only resources after scene teardown. Destroying sprites alone does not necessarily unload cached textures. Atlases may reduce texture switching/file overhead; they do not automatically reduce decoded pixel memory. Retain native masters in source/research storage and package prepared sprites at an appropriate runtime size. Check two venue transitions repeatedly for leaks, not just one cold launch.

Keep the number of live foreground sprites and active reactions bounded. Lower-detail, less animated distant groups can support density. Audit skins and atlases by measured dimensions; don't ship enormous mostly empty generated sheets simply because compression makes their files seem small.

## Exhibition unlocks and replay behavior

Proposed initial catalog:

| Entry | Availability | Mode | Venue |
| --- | --- | --- | --- |
| Marigold wrestling | Available initially | Normal wrestling | Marigold |
| Carnival wrestling | After first story carnival victory | Normal wrestling / carnival challenge preset | Carnival |
| Bar fight | After completing its story encounter | Special five-opponent encounter | Outside the bar |

Derek wants story locations and encounters reusable afterward. Offer the carnival as a venue choice for ordinary exhibition once it exists; also retain its authored challenge as a replay preset if useful. Keep a special encounter category in the same exhibition menu for the bar fight. It must not accidentally appear as a normal one-on-one ring location with the wrong rules.

Availability requires BOTH implementation/assets ready AND the unlock condition. An approved concept image does not make an entry playable. Development overrides must not write legitimate campaign unlocks. Permit metadata for future venues without showing broken menu entries.

Keep persistent unlocks separate from the current career save so starting a new story does not silently erase earned exhibition content. Version/migrate the ledger, handle missing/old data, and write completion/unlock idempotently. Scope is a local profile initially; account/cloud sync is later platform work. Define an explicit reset action if wanted rather than coupling reset to New Game.

Replays never award campaign rent money, duplicate the carnival $100, advance scenes, alter relationships or consume story rewards. Returning from exhibition goes to exhibition selection. Story defeat/retry uses its own continuation contract. Stable `encounterId`, `venueId`, `crowdRecipeId`, launch context and result data keep these outcomes distinct.

## Practical build order

1. Inventory existing audience assets and create a deterministic recipe composer with placement limits and catalog validation. Keep present behavior as a comparison preset. Test valid selection, no adjacent repeats, scarce catalogs, stable seeds, and isolation from combat randomness.
2. Make a developer comparison using real existing crowd art: a few seeds, actual game scale and motion, then judge it visually. This exposes whether fatigue comes from faces, synchronized animation, density or all three. A small recipe inspector/seed/reshuffle control is enough; no elaborate editor yet.
3. Add the carnival venue renderer and its prepared crowd. Initially reuse live ring geometry. Prototype a venue selector with no unlock claims until the story result flow exists. Verify rope/post occlusion, reactions, controller selection, loading and return-to-menu behavior.
4. Connect the carnival story victory to the persistent unlock ledger and let exhibition reuse the same match/venue. Prove save/reload, New Game preservation, one unlock, no replay money and no story advancement.
5. Build the bar fight once as its own encounter implementation, reusing suitable fighter/move components. Keep its five-man logic, floor boundaries, outcome and camera local to that mode. Then register the same finished encounter for story and exhibition, with the same unlock/replay checks.
6. Add convention audience assets and its booking once the story date is chosen. More recipes and venues should be data/asset additions after these seams work.

This is a staged implementation plan, not a request to build every venue now or interrupt the approved grapple checkpoint. A reusable crowd composer plus the first second-venue proof is the first bounded deliverable.
