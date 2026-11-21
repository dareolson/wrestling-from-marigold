# Headlock takeover receiver resistance — Codex, Nov 19

Derek: “looking better but George is too wooden.” Changed only headlockTakeover's receiver track in matMoves.js. All uncommitted; no commit/merge/push/reset. Previous FK arm, hop/swing, carry, duration, impact and exact layer order retained.

Added asymmetric arm reactions during the overhead entry, a staggered stance and brief pull against the clasp at .9s; outside leg trails the hip and free arm opens during the fall. Added .1s-scale impact contraction at 1.74, asymmetric leg settling and one torso squirm at 1.88, then varied arms/legs through release. Pain face remains from impact. These keys affect all receivers; not George-specific. No hand-contact constraint was added: the reaching hand is posed, not verified as a physical peel on Lou's forearm. No visual approval claimed.

Evidence and repro: research/animation/headlock-sell-2026-11-19/. Scripts copied from previous pass; before-matMoves.txt snapshots the start of this pass. capture.mjs saves .75/1.3/1.65/1.74/1.88/2.75 stills. preserve.mjs confirms all other mat move builds and damage unchanged, including approved hammerlock/wristlock/stretch/deathlock.

Node 22.23.1 npm test: 1441/1441 pass. npm run build: pass, existing >500 kB chunk warning. git diff --check: pass. Browser matrix results are in matrix.json and matrix-summary.jsonl.

Preview remains /tools/mat-preview/?move=headlockTakeover&att=thesz-procreate-v1&def=george-roster-v1&light=v1 . Derek judges the motion; the Nov 18 canvas-support limitation remains.

Final browser matrix: 16/16; exactly one [9, headlockTakeover] hurt call each, zero non-finite joints or page errors, standing/down/supine ending with no active move. Full-weight neck contact (.7–2s), maximum gap 0.049782383 px.
