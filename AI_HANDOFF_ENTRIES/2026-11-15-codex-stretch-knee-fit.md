# Stretch knee fit: Lou as reference

Derek said the hook was almost there, with Lou's knee fit best, and requested slight knee-joint adjustments for the others. Work remains uncommitted in `/Users/home/Documents/wfm-stage12`, `moves/stage12`; no merge or push.

Kept Lou's painted knee overlap at 3 scaled rig pixels. George and Guido now use 4; Kowalski uses 4.5. These are small rigid calf/boot-art tucks into the thigh bevel, blended by the existing leg-contact weight. No geometry stretch or new artwork. The underlying knee/ankle solve, outside hook, reverse unhook, layering, support foot, arm control and hands-first fall are unchanged.

Used the existing role/rig override contract in the move's `params` data, passed into the single shared build function. No rig-name conditionals or separate move sequences. Default/unrecognized rigs retain 3. Added a regression check proving each fitted clip differs from Lou's reference clip only by its declared knee-overlap value.

59 focused tests pass; build and `git diff --check` pass. Enlarged hook/strain/release captures for all four attackers, plus mirrored hook/release views, are in `research/animation/stretch-knee-fit-2026-11-15/`. No full-suite repeat for this small parameter-only fit; preceding release pass recorded 1381 passing tests and five existing art/fixture failures.

Changed: `src/animation/clips/matMoves.js`, `tests/legContacts.test.js`. Preview: http://127.0.0.1:5233/tools/mat-preview/?move=abdominalStretch&att=george-roster-v1&def=thesz-procreate-v1
