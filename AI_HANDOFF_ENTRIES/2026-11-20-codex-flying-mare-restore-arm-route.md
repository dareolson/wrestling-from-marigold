# Flying mare: undo head-crossing arm route; base arms during rise — Codex, Nov 20

Derek rejected the Nov 20 outward/reverse-elbow route: outside arm still overlapped Lou's torso and the back-arm art now covered George's head. Explicitly asked to undo that change but keep the larger arm. Also requested switching to regular arms while Lou gets up, using the movement to conceal the switch.

Changed only flyingMareClip's shoulder grip from reverseElbow:true back to natural:true. Retained the 1.15 back-arm size during the hold. No new torso mask, art editing or alternative routing added. This returns to the earlier bend; torso silhouette is still Derek's visual judgment, not claimed quantitatively overlap-free.

Normal proportions now return at **5.55s**, the getting-up key: scale blends 1.15 at 5.22 to 1 at 5.55, and all keys from 5.55 explicitly select base upper arms and base forearms. Previous slower size fade through 6.25 removed. Shoulder/wrist grips release by 5.35, so the handoff happens after contact ends. Added regression assertions for base parts and scale=1 at the rise key.

No changes to .82 impact, 14 damage once, 4.23s seated hold, knee/pain, two retreat steps, or 7.15 total. No accepted move changed; full-clip preserve script passes for all other mat clips. Everything uncommitted; no commit/merge/push/reset.

Checks after these focused reversions: **46/46 targeted contact/layer/mat tests pass**, build pass (existing chunk warning), diff --check pass. Lou→George browser cases both facings: one hit each, no page errors/non-finite joints, same held state and cleanup. Back-arm upper/fore/image-width ratios remain **1.15**; shoulder gap ≤**0.000059 px**, wrist gap ≤**0.415765 px**. Previous full-suite 1458/1458 and 16-case matrix predate this small route/handoff change; not claimed as rerun here.

Evidence/repro: research/animation/flying-mare-arm-revert-2026-11-20/ before-matMoves.txt, capture/verify/preserve scripts, tests/build logs, matrix.json, capture.jsonl. frame-3.png shows restored hold route; frame-5.png shows base arms during getting up. Preview URL unchanged: /tools/mat-preview/?move=flyingMare&att=thesz-procreate-v1&def=george-roster-v1&light=v1 . Await Derek.
