// v9 broadcast-downsample diagnostic candidate for the isolated George AI
// pilot — see CLAUDE_GEORGE_V9_BROADCAST_PASS.md for the full brief this
// implements.
//
// Why this exists: Derek is not yet convinced george-ai-pilot-v8 improves on
// shipped George. The concrete concern is that v8's fine/variable ink
// strokes break up under runtime minification and the screen-space scanline
// overlay — v8's torso.png is 619x910 but renders at roughly 64x104 world px
// at the near ring depth (heightScale + perspective folded in — see
// tools/debug/measure_v8_bounds.mjs's phase0_measurements.json), a ~9-10x
// minification, well past shipped George's own ~2.4x (190x260 source ->
// ~64x87 at the same near depth/heightScale).
//
// Phase A tests ONE narrow, reversible question: does high-quality offline
// downsampling of the SAME approved v8 artwork to a broadcast-appropriate
// raster (~2x each part's own measured maximum on-screen size, not a single
// blanket ratio) read better under minification + scanlines than serving the
// full 7-8x-oversized v8 source straight to the GPU's minification filter?
//
// This is NOT a redraw, retune, or ink treatment. Every part below is a
// byte-independent Lanczos-3 premultiplied-alpha downsample of the frozen
// v8 PNGs (see tools/wrestler-cutter/prepare_george_v9_broadcast.mjs) —
// full source canvas maps to full output canvas, same aspect ratio, no
// crop/pad/rotate/flip, no sharpening/posterization/line work. Every rig
// value below (box, jointPivotFrac, distalAnchorFrac, soleAnchorFrac,
// heightScale, headScale, all offsets, thighH, rigProfile.sockets) is
// inherited from george_ai_pilot_v8.js completely unchanged — only `id` and
// the nine texture `key`s differ, exactly as the brief requires ("the v9
// character config should inherit v8 and change only id and texture keys").
// Does not replace george-ai-pilot, -v2, -v4, -v5, -v6, -v7, or -v8 — all
// seven remain intact, reversible comparison points — nor shipped
// george.js/george/. Not adopted; diagnostic only, pending Derek's visual
// review of the Phase A comparison matrix.
import { georgeAiPilotV8 } from './george_ai_pilot_v8.js';

export const georgeAiPilotV9Broadcast = {
    ...georgeAiPilotV8,
    id: 'george-ai-pilot-v9-broadcast',
    textures: {
        ...georgeAiPilotV8.textures,
        head: 'george_ai_v9_broadcast_head',
        torso: { ...georgeAiPilotV8.textures.torso, key: 'george_ai_v9_broadcast_torso' },
        pelvisOverlay: { ...georgeAiPilotV8.textures.pelvisOverlay, key: 'george_ai_v9_broadcast_pelvis_overlay' },
        upperArm: { ...georgeAiPilotV8.textures.upperArm, key: 'george_ai_v9_broadcast_upper_arm' },
        nearForearm: { ...georgeAiPilotV8.textures.nearForearm, key: 'george_ai_v9_broadcast_near_forearm' },
        farForearm: { ...georgeAiPilotV8.textures.farForearm, key: 'george_ai_v9_broadcast_far_forearm' },
        nearShin: { ...georgeAiPilotV8.textures.nearShin, key: 'george_ai_v9_broadcast_near_shin' },
        farShin: { ...georgeAiPilotV8.textures.farShin, key: 'george_ai_v9_broadcast_far_shin' },
        thigh: { ...georgeAiPilotV8.textures.thigh, key: 'george_ai_v9_broadcast_thigh' },
    },
};
