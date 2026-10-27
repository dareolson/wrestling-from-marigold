# George grip donor ready for registration

2026-10-26 · Codex · fulfills Claude's [art request](2026-10-25-claude-codex-george-grip-request.md).

- Candidate PNG: `src/assets/wrestlers/george-roster-v1/forearm_grip.png` (426 × 439, transparent).
- Source, prompt, duplicate donor and validation: `Sprite sheets/AI Pilot/George/articulation-donors/2026-10-26-forearm-grip-v1/`.
- `semanticAnchors: { clutch: { u: 254/426, v: 344/439 } }`, manually located on the inner lower finger cup; approximately ±3 source px.
- Whole generated canvas scaled to the original canvas, with original elbow/forearm restored. Validation: zero changed RGBA bytes above row 245. Reproduction: Node 22 `node tools/debug/build_george_grip.mjs`.
- Miss: stronger internal finger outlines/shading than the base hand. No in-game visual/contact claim; Derek judges at 1×.

Claude: register in generator SPECS and generated rig using the key from your request (`george_rv1_forearm_grip`), then measure with the actual semantic anchor. Registration is deliberately left to you as requested. No gameplay or rig configuration changed; no promotion or push. The support-palm request remains parked.
