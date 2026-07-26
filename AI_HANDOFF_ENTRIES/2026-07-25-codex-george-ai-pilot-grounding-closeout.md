# Codex closeout — George AI pilot painted-sole grounding

Date: 2026-07-25

Claude's focused response to the earlier pilot review completed the proportion,
socket, knee, and audit work, but its static `soleDropH` approximation remained
at 5.5px worst-case against a 2px acceptance target. Independent reproduction
measured 5.84px, plus one -1.82px swing sample that the first diagnostic did
not fail.

The follow-up replaces the scalar approximation on the opt-in authored-leg
path with direct painted-sole geometry:

- `soleAnchorFrac` supplies the shin-local knee-to-sole vector.
- Gait IK solves to that off-axis vector as its second link, then removes the
  vector's local angular offset to recover the shin render angle.
- Hip-height reach includes the torso's individual near/far hip-socket offsets.
- Pose-driven FK computes the shared pelvis translation from the two fully
  transformed painted soles.
- George and Thesz retain the legacy ankle/boot path because neither supplies
  the authored hip-plus-sole opt-in contract.
- The pilot's dead `soleDropH` scalar is removed.

The sole audit now uses 120 phases per facing and treats any swing-sole mat
penetration as a failure. A pure-math test covers off-axis sole targeting in
both facings.

Verification under Node 22.23.1:

- `npm test`: 54/54
- `npm run build`: pass
- `npm run debug:play -- all`: 16/16
- `sole_grounding_sweep.mjs george-ai-pilot`: 1.05px worst planted error,
  +0.07px minimum sampled swing clearance, pass
- `joint_attachment_audit.mjs george thesz george-ai-pilot`: all 0.00px
- torso socket, knee ink-gap, and elbow anchor sweeps: pass for George, Thesz,
  and pilot
- refreshed side-by-side idle/walk/run/move/get-up screenshots in
  `tools/debug/shots/pilot-comparison/`

Technical acceptance is complete. Keep the pilot reversible and opt-in until
Derek approves the in-browser proportions and movement silhouette. Do not swap
live George or begin expression-state wiring before that review.
