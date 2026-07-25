// Gorgeous George — AI art-swap pilot. Reversible, opt-in character config
// (select via ?p1=george-ai-pilot / ?p2=george-ai-pilot — see Arena.js's
// PRESETS). Do NOT replace the live george.js textures with this file; it
// exists so the new AI-generated "gameplay master" art can be compared
// side-by-side with the shipped George before Derek approves a swap.
//
// Source of truth for every measurement below (not committed — Sprite
// sheets/ is gitignored):
//   Sprite sheets/AI Pilot/George/CLAUDE_INTEGRATION_HANDOFF.md
//   Sprite sheets/AI Pilot/George/PILOT_NOTES.md
//   Sprite sheets/AI Pilot/George/rig-profile-pilot.json
// Approved parts copied verbatim from
// Sprite sheets/AI Pilot/George/rig-parts-source/transparent/ into
// src/assets/wrestlers/george-ai-pilot/ (this file's textures.*.key values).
//
// Every limb canvas is pre-rotated so its proximal-to-distal axis is exactly
// vertical and centered at u=0.5 (the pilot's own contract, point 2) — unlike
// George's/Thesz's live art, no lateral distalAnchorFrac.u term is needed
// here; only v (how far down the canvas the true joint actually sits) does
// real work. jointPivotFrac = parts.<name>.proximal[1]; a parent's
// distalAnchorFrac = { u: 0.5, v: parts.<name>.distal[1] } — both straight
// from rig-profile-pilot.json (contract points 3-4). box.w/h use the box
// derivation formula from CLAUDE_INTEGRATION_HANDOFF.md: textureScale =
// desiredBoneLength / bonePixelLength; box.w = canvasW * textureScale;
// box.h = (canvasH - proximalPxY) * textureScale — one uniform scale per
// part, rounded only here for the in-engine comparison.
export const georgeAiPilot = {
    id: 'george-ai-pilot',
    // Same fill colors as george.js — only used as the flat-fill fallback
    // for non-textured draws; every part here is textured, so these are
    // effectively unused, kept for parity/safety.
    skinCol:   0xc7a2ac,
    trunksCol: 0xd54283,
    textures: {
        // Reuses george.js's measured real-world heightScale (0.798) rather
        // than re-deriving one: this pilot represents the SAME character
        // (George, 5'9") in new art, not a new proportion pass, so the
        // comparison is apples-to-apples at the same real-world height. Per
        // the safe integration sequence's "solve one global visual height
        // scale. Do not tune six independent scales" — no per-limb scale
        // knobs are set below beyond the one shared per-part textureScale
        // baked into each box.
        heightScale: 0.798,
        head: 'george_ai_head',
        // The pilot's torso bakes the neck in like George's/Thesz's live art
        // (same _neckInTorso contract) — the head layer is neck-free.
        neckInTorso: true,
        // headAnchorFrac (2026-07-25, opt-in — see Skeleton.js's constructor
        // comment): this head is drawn at a 3/4 angle, so its painted neck
        // point isn't at the legacy bottom-center (0.5, 1) origin. Value is
        // rig-profile-pilot.json's parts.head.neck verbatim. Do not add
        // headOffsetX/Y to compensate — the anchor is the correction.
        headAnchorFrac: { u: 0.4122137404580153, v: 0.84375 },
        // headScale intentionally left at the default (1) — no measured
        // real-world head-size pass exists yet for this art (unlike George's
        // live-tuned 0.745). The comparison screenshots are what this pilot
        // is for; if the head reads mis-sized next to the now-anchor-correct
        // neck seat, that is Derek's call during the visual review, not a
        // guessed number here.
        torso: {
            key: 'george_ai_torso',
            // canvas 294x530, box.h pinned to the shared torso bone length
            // (P.torsoH=112, same convention as thesz.js's bare-string torso
            // entry defaulting to TEX.torso); box.w preserves the canvas's
            // own aspect ratio at that height (294/530*112 = 62.15 -> 62).
            box: { w: 62, h: 112 },
        },
        // rigProfile.sockets: full five-socket profile (neck + both
        // shoulders + both hips), straight from rig-profile-pilot.json's
        // parts.torso.sockets. nearHip/farHip presence is what opts this
        // character into Skeleton.js's dynamic-pelvis hip-socket mechanism
        // (see that file's _solveTorsoOrigin comment) — George's and
        // Thesz's own rigProfile.sockets deliberately has no hip entries yet
        // and is unaffected by this.
        rigProfile: {
            sockets: {
                neck:         { u: 0.42517006802721086, v: 0.09811320754716982 },
                nearShoulder: { u: 0.8163265306122449,  v: 0.18679245283018867 },
                farShoulder:  { u: 0.1564625850340136,  v: 0.1830188679245283 },
                nearHip:      { u: 0.7244897959183674,  v: 0.9113207547169812 },
                farHip:       { u: 0.1836734693877551,  v: 0.8867924528301887 },
            },
        },
        upperArm: {
            key: 'george_ai_upper_arm',
            box: { w: 43, h: 85 },
            jointPivotFrac: 0.2022464560409934,
            distalAnchorFrac: { u: 0.5, v: 0.8429707749019165 },
        },
        forearm: {
            key: 'george_ai_forearm',
            box: { w: 84, h: 138 },
            jointPivotFrac: 0.1895354781843097,
            // Terminal part (no child limb attaches to the forearm's own
            // distal end) — no distalAnchorFrac needed, same as George's/
            // Thesz's live forearm entries.
        },
        thigh: {
            key: 'george_ai_thigh',
            box: { w: 60, h: 69 },
            jointPivotFrac: 0.2128098050935927,
            // Unlike George's/Thesz's live thighs (knees investigated,
            // found not to need this — see AI_HANDOFF.md's 2026-07-25
            // "knees investigated" entry), this pilot's box-derivation
            // formula bakes extra below-hip overlap directly into box.h
            // (69 vs. the shared 56 bone length), so the true knee point
            // does NOT sit at the generic bone-length endpoint — the
            // pilot's own contract (point 4) requires this term.
            distalAnchorFrac: { u: 0.5, v: 0.848911360030924 },
        },
        shin: {
            key: 'george_ai_shin',
            // Boot baked into the shin canvas, same convention as George's/
            // Thesz's shin entries — box.h includes the below-ankle boot art
            // (canvas rows past the distal/ankle anchor down to the sole),
            // scaled by the same single per-part factor as everything else.
            box: { w: 106, h: 151 },
            jointPivotFrac: 0.15577284333708233,
        },
        // Expression head variants (2026-07-25, Derek's request): five
        // approved AI-generated expressions, normalized onto this exact
        // 262x320 canvas and headAnchorFrac by
        // tools/wrestler-cutter/normalize_pilot_expressions.mjs (source:
        // Sprite sheets/AI Pilot/George/expressions/transparent/, gitignored
        // -- raw sources are independent generations at a different canvas
        // with no measured neck anchor of their own). This is DATA ONLY --
        // Skeleton.js/Wrestler.js have no expression-switching mechanism yet
        // (see CLAUDE_INTEGRATION_HANDOFF.md: "Expression and hand/foot
        // swapping are not supported by the current Skeleton.js and are not
        // v1 requirements"), so none of these five are preloaded or given a
        // texture key -- only `idle` (== textures.head above) is currently
        // wired. Whoever adds that runtime state machine should preload each
        // file below under its own key the same way Arena.js's PART_FILES
        // loop loads `head`, then swap Skeleton's `this.head` texture on
        // expression change. All six share this exact canvas/anchor by
        // construction (the normalize script's placement check, not an
        // independent anatomical measurement -- see that script's header
        // for the bbox-relative-fraction method and its cross-check deltas,
        // 29-31px vs. idle's own 25.58px). Do not add per-expression
        // headOffsetX/Y or a different headAnchorFrac; if an expression
        // reads mis-seated in-engine, re-run the normalize script with a
        // corrected fraction rather than patching around it here.
        headExpressions: {
            idle:      'head.png',
            smug:      'head_smug.png',
            angry:     'head_angry.png',
            hurt:      'head_hurt.png',
            exhausted: 'head_exhausted.png',
            shocked:   'head_shocked.png',
        },
        // No legOffsetX/Y, nearLegTilt, farLegOffset*, HIP_STAGGER-adjacent
        // knobs, nor armOffsetX/Y/farArmOffset*/nearArmTilt — the pilot's own
        // contract explicitly forbids reintroducing per-part screen-space
        // compensation now that hips/shoulders/neck are all torso-socket
        // rooted and jointPivotFrac supplies each limb's own proximal
        // overlap. If something reads off during the comparison gate, the
        // fix is a socket/anchor re-measurement, not a knob here.
    },
    idlePose:  'powerIdle',
    tauntPose: 'tauntArmsWide',
    // Same kit as george.js — this is an art swap, not a new character.
    moveSet: [
        'irishWhip', 'clothesline', 'bodySlam', 'pin', 'elbowDrop', 'dropkick',
        'doubleAxeHandle', 'sleeperHold', 'headlock', 'armDrag', 'jab', 'headbutt',
    ],
};
