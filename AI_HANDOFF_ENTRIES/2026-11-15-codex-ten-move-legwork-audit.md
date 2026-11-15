# Ten new moves: legwork audit and fixes

2026-11-15 · Codex · Derek requested all ten Stage 10/11 moves audited for realistic leverage, support-foot timing, gumby legs on both roles, and a better mounted-punch configuration.

**Review:** [live replay tool](../tools/legwork-preview/index.html), served at `/tools/legwork-preview/`. All ten executors, all four rigs in either role, both facings. Starts on mounted punches; intentionally bypasses kits for inspection and disables faces for stable targets. [Detailed report](../research/animation/legwork-2026-11-15/REPORT.md), [320-case summary](../research/animation/legwork-2026-11-15/summary.json).

## Changed

- `lightStrikes.js`: complete shin ownership including neutral final keys; rear support on all eight standing strikes, front support for non-running non-sweep strikes, gradual plant release. Sweep has a nearly straight striking leg and revised per-attacker support stance/step-in, solved with a support-error penalty.
- `groundStrikes.js`: mounted punches now use a low bilateral kneel with heels folded back, hips closer over abdomen, far leg behind receiver / near leg in front, two stable supports, per-rig fist retune, explicit leg straightening on rise. Body-stomp art/impact keys remain the existing hand-stomp-derived ones.
- `Wrestler.js`: mounted receiver's pelvis stays down and leg sell offsets are quarter strength; no global sell changes. Clear gait blend when these executors take over. Just-finished light attacks avoid standing-separation teleports from a falling/down receiver; idle attackers do not instant-flip their feet when a receiver falls past them. Movement input releases the facing hold. These exceptions are scoped to the new light-attack encounter.
- Tests: neutral shin recovery and stable bilateral mount, updated alternating-hand assertion to check the actual guard/striking roles rather than assuming the larger arm angle means the punching arm.

## Verification and limits

Baseline 80 cases across four pairings, both facings. Final **320 / 320** cases across all 16 pairings × two facings × ten moves; correct event counts, finite both-role joints, all attackers return standing, no page errors in completed runs. Two browser initialization resource timeouts were resumed in fresh browsers. Raw samples are archived with the report. Perspective-normalized thigh/shin lengths remain constant (max/min approximately 1.000000), so no bone resizing was needed.

Final mount declared plant residual max .06 px; fist/face proxy median 3.8 / max 11.3 px. Sweep support residual max .20 px (earlier intermediate fit reached 28 px), but ankle proxy miss still reaches 27 px including legal Guido cases. Shoulder block's old deep body overlap remains; max chest proxy miss about 20 px. Back elbow actual users George/Kowalski max about 8 px, forced Lou can miss 29 px. Running-forearm gait entry still deserves polish; some forced-user sole steps remain large. Root depth vs captured sole offset can reach 5.11 px; plant residual alone does not certify exact painted-floor contact. Ground fixtures use long down timers; escape/early recovery and AI selection are not certified by this audit.

**Tests 1371/1371, production build and diff whitespace check pass.** Logs and exact metrics in the report folder. No fresh painted-pixel contact proof or visual approval claimed. Existing G10 recordings remain the earlier baseline; use the live tool for current code. No gate promotion, kit/damage/input changes, commit or push. Changes are uncommitted on top of `2fee69e`.
