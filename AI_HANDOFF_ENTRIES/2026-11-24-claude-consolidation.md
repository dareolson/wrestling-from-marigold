# Consolidation: integration, movement promoted, Lou2 body, art revision system (Claude, 2026-11-24)

**Ask (Derek):** consolidate everyone's work and clean up. Get the movement changes in (walk and run included). Put the current Lou in production and shelve the old one. Systematize art changes, because every wrestler's knees, and maybe elbows, will be re-done. Follow-ups: replace Lou's body parts rather than build a new rig (calves over thighs, far leg over trunks); merge the Stage E taunts.

## Commits (story/marigold-opening, pushed 2026-11-24)

| sha | What |
| --- | --- |
| 81cdf181 | Codex Nov 21-24 integration: walk/run/arms/stance trials, George relaxed v3 ready hands, leapfrog, recoveries, head scissors DRAFT, body scissors retired. The tree matched Codex's packet snapshot 117/117. |
| bc103d4a | Lou2 rig source (fixes 49cb207a's import of an uncommitted file) |
| (merge) | george/hair-fix Stage E taunts |
| 8408492e | walk/run/arms/stance/readyArt default-on (`=off` opt-outs); mat-preview default no longer the retired body scissors |
| c513837e | 22 handoff entries, research/art provenance folders, integration record; .gitignore for frame strips/footage |
| (next) | Lou body from Lou2.psd; old body shelved; generated-base split for all four rigs; ART_REVISION.md + tools |

## Lou

- **Rig:** the rig id stays `thesz-procreate-v1`, so every Lou clip override, the back sell and the expression faces stay. Body parts come from Lou2.psd through `src/characters/generated/thesz_procreate_v1.base.js`.
- **Draw order:** read from the PSD layer order: `shinUnderThigh` false, `farLegOverTorso` true, `forearmOverUpperArm` true.
- **Head:** the Procreate head stays. Lou2's head is the same painting with 6px of padding (IoU 1.000).
- **Variant re-fit** (`research/art-revisions/2026-11-24-lou/rebase.json`):

  | Part | IoU (fit) |
  | --- | --- |
  | forearm | .979 |
  | upper arm | .961 |
  | torso | .955 |
  | near shin | .940 |
  | far shin | .826 |

  0 px of ink lost. The anchors carried over: backWaist, heel/toe and four clutch points.
- **Splices:** the far palm forearm and both ankle twists are spliced. The grip, clasp and chop forearms are not: their donors are slimmer than the new forearm, so a cross-fade doubles the contour (sweep checked at four splice rows).
- **Projected arms** (headlockWrap, chop sweeps): scale multiplied by 0.7907/1.08526 so their on-screen size is unchanged.
- **Height ladder:** Lou is 0.5% shorter in ink. Ratios re-pinned: George .9663, Kowalski .9987, Guido .9695. George's own ink also re-measured 236.5 → 234.7 with unchanged art, probably the now-default ready stance (unconfirmed).
- **Shelf:** `?p1=thesz-procreate-shelf` is the old body, frozen.

**Misses / open:**
- grip, clasp and chop forearms show the old elbow cap: an art pass is needed
- far-shin ankle twist uses a different boot drawing
- backSell `holdW`/`recovery*` and `crownBelowHip` are pre-swap values: re-measure with hold_weight_sweep / recovery_probe
- Derek (2026-11-24): "they seem fine from a distance"; the clips are too small to judge closely. Not a close-up approval.

## System

[ART_REVISION.md](../ART_REVISION.md).
- **Rig files:** George, Kowalski and Guido now spread a generated base too. Their generator reproduces the art byte for byte, and the base values match the old files exactly.
- **Driver:** `node tools/art/revise_rig.mjs <rig>` runs the whole procedure. A `--dry` run on George gives IoU 1.000 and George's exact anchors.

## Cleanup

- **Worktrees:** `wfm-george-hair` and `wfm-stage12` removed, and their branches deleted after merge. Their ~270 ignored review captures were copied into the main checkout first.
- **Codex packet:** `integration/` is untracked; its record lives in `research/integration-2026-11-24/`.
- **Stray folder:** `private/` (a dry-run copy from this session) deleted.
- **Old branch:** `thesz-v2-profile-normalization` tagged `archive/thesz-v2-profile-normalization` (pushed) and deleted (PLAN_CLEANUP T3).

## Checks

- npm test: 1544/1544 (Node 22), on the committed index tree
- `node tools/rig/validate-character-rigs.mjs`: all valid
- build OK; `moves:coverage --check` passed (49 baselined)
- size-pop soak: PASS (0 pops or errors outside the named list; 11 named lou-kowalski ground-attack route pops, which are an accepted category)
- compare film, Lou vs shelf: `research/art-revisions/2026-11-24-lou/compare/index.html`. 56 cases (14 moves on George × both facings × 2 bodies), 0 page errors. Videos stay on disk (ignored). Not judged: Derek looks.
- close-up film (2026-11-25): `research/art-revisions/2026-11-24-lou/closeup/index.html`, from `tools/debug/lou_shelf_closeup.mjs`. Chop, ankle lock, hammerlock, test of strength, headlock, backdrop suplex, piledriver; zoom 2.0, camera tracks the pair; 28 clips, 0 page errors. Not judged.
