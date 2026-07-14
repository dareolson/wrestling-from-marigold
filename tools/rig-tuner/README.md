# Rig Tuner

Dev-only visual editor for the skeleton rig's tuning values — replaces the
hand-edit-a-constant → screenshot → compare loop. Sibling of
`tools/wrestler-cutter/`. Origin/rationale: AI_HANDOFF.md 2026-07-14 (the
counter-proposal to the Unity migration).

**Scope cap:** constants tuner + pose previewer only. No animation timeline,
no keyframing, no clip authoring — that's a separate buy-Spine decision.

## Run

```sh
npm run rig:tuner        # Node >= 20.19 (nvm use 22 / /opt/homebrew/opt/node/bin)
```

That starts the normal Vite dev server and opens `/tools/rig-tuner/`. The
tool imports the **real** `src/Skeleton.js`, the real `POSES` from
`src/Wrestler.js`, the real character configs, and the real PNGs — it is not
a reimplementation, so what you see is what the game renders (minus the
arena's film-grain/color filters, deliberately, for clean art comparison).

## What's adjustable

- **Preview**: character (george / thesz / placeholder), pose, facing, zoom,
  walkPhase (+ animate), moveBlend, combatBlend, runBlend.
- **Pose dials**: the six `POSES` channels (lLeg, rLeg, lArm, rArm, lean,
  crouch) of the selected pose, live.
- **Skeleton.js — P**: global bone lengths / block sizes.
- **Skeleton.js — TEX**: global display boxes for textured parts.
- **Skeleton.js — RIG**: the overlap/stagger scalars (ELBOW_OVERLAP,
  HIP_OVERLAP, KNEE_OVERLAP, SHOULDER_STAGGER, HIP_STAGGER, NEAR_SHIN_*,
  FAR_LEG_*, …).
- **Character knobs**: every per-character `textures` knob (headOffsetX/Y,
  headScale, armOffset*, legOffset*, near/far leg+shin offsets and tilts,
  nearShinScale, per-character thighH/shinH bones, and object-form display
  boxes like the shin's). Tilts are shown in degrees.
- **Drag handles**: colored dots on head / shoulder / thighs / shins drag the
  matching offset pair directly (legend under the Preview group).
- **Reference overlay**: load any image (e.g. `Sprite sheets/New
  Lou/LouTheszFullBodyRef.png`), drag to position, opacity/scale sliders,
  front/behind toggle.

## Getting values back into the code

The **Export** panel shows only what you changed, grouped by target file —
`src/Skeleton.js` (P / TEX / RIG), `src/characters/<name>.js` (textures), and
`src/Wrestler.js` (POSES) — as paste-ready lines. "copy all" puts it on the
clipboard. The browser never writes source files; paste, then run the usual
`npm test` / `npm run debug:play -- all` / `npm run build`.

Notes:
- Values persist only for the browser session (reload = back to committed
  values). Copy out before reloading.
- Editing `P.thighH`/`shinH` affects characters *without* their own bone
  override (thesz has one). `TEX` edits affect parts using string-form
  texture entries; object-form boxes (every shin, george's torso, thesz's
  forearm/thigh) are edited in the character group instead.
- Remember the documented couplings when pasting: `TEX.thigh.h` =
  `P.thighH + RIG.HIP_OVERLAP`; a character's shin box height must grow with
  `RIG.KNEE_OVERLAP`; thesz's far-leg offsets must stay in lockstep with his
  near-leg values (see the comment block in `src/characters/thesz.js`).
- Upright rendering only (`updateUpright`) — grounded/get-up poses aren't
  previewed here.

## Production impact

None: `vite build` only bundles the root `index.html`, so this page never
ships, and the game itself doesn't load anything from this directory. The
only `src/` change made for the tool is Skeleton.js exporting its existing
`P`/`TEX` objects and its (value-identical) `RIG` scalar object.

## Scripting hook

`window.__RIG_TOOL` exposes `{ state, P, TEX, RIG, POSES, setCharKnob,
setRig, setP, setPose, setCharacter, setPoseName, exportText, skeleton() }`
for headless/Playwright driving — see `smoke.mjs` (`node
tools/rig-tuner/smoke.mjs`, needs the system Chrome like tools/debug).
