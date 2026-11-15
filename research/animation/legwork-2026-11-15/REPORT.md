# Ten-move legwork audit — 2026-11-15

Audited the ten moves from commits `334ce99` / `4179faa`, after `2fee69e`. Changes are uncommitted and remain behind the existing `?light=v1` route. No kit, damage, input or promotion decisions changed.

**Live review:** `/tools/legwork-preview/` on the local Vite server. Select any of the ten moves, either wrestler role, and facing; Replay runs the actual executor with AI disabled. Starts on mounted punches. This deliberately bypasses kit restrictions for inspection and disables expression swapping for a stable head target.

## Fixes

1. **Explicit shin ownership through recovery.** Ground mount and sweep clips previously authored folded shins, then omitted shins on their standing key. The sampler carries sparse channels forward, so knees unfolded against the old shin angle: the baseline recorded positive knee readings up to .695 rad after the mount and 1.0 on the sweep. New complete lower-body keys restore neutral shins. Standing-strike keys also author a consistent bend for their crouch rather than inherit another move's leg state.
2. **A low, bilateral mount.** The old arm-bar half-kneel left the far knee raised and its foot well above the mat. Both heels now fold back with the knees close to mat level, pelvis closer over the receiver's abdomen, and both supports retained through the punches. The far leg draws behind the receiver, near leg in front. Fists were retuned per attacker rig from this base. Rise keys explicitly straighten both shins.
3. **Receiver legs under the mount.** A mounted receiver no longer plays the unrestricted ground-kick sell after each fist. Pelvis lift is removed and leg offsets reduced to one quarter; chest/arm recoil still sells the punch. Other ground sells are untouched.
4. **Weight-bearing windows for all eight standing strikes.** Added rear-foot support during loading/impact, front-foot support for the non-running hand/body strikes, and a gradual release into recovery. Plants act on drawn sole points through the existing solver. No shared skeleton dimensions or leg lengths were changed.
5. **Sweep with a nearly straight striking leg and stable support.** Replaced the deeply folded striking leg on George/Guido/Kowalski. Refit the support stance and small step-in with a cost on support-foot error as well as ankle contact. Final declared support residual is below .20 px throughout the matrix; reaching every receiver's ankle perfectly is still an open issue below.
6. **Recovery pops.** Clear stale walking/running blend when the three executors take over. A just-finished light attack no longer gets a standing-separation teleport away from a falling/downed receiver. An idle attacker does not instantly mirror his feet when that receiver passes behind during a fall; movement input releases that facing hold. Scope is these new light-attack encounters, not a global change to all falls or collisions.

## Evidence

- Baseline: **80 real-executor cases** (Lou–George, George–Lou, Kowalski–Guido, Guido–Kowalski; both facings; all ten moves). Before pictures/summary in `before/`, raw samples in `before-frames.jsonl.gz`.
- Final: **320 unique cases** = 10 moves × 16 pairings × 2 facings, including forced non-kit users. Every expected impact event fired; every attacker finished standing. Both actors' joint positions remained finite. No browser page errors in completed runs. Two initial parallel shards hit game-initialization timeouts and were resumed in fresh browsers; those were harness/resource failures, not counted as passing cases.
- Ground fixtures deliberately give the receiver a long down timer so the entire animation can be inspected. This is not a test of early receiver recovery, escaping the mount, or AI selection of these moves; those remain separate gameplay checks.
- Both-role segment lengths, normalized for perspective scale, remained constant to floating-point tolerance (max/min approximately 1.000000). The apparent gumby problem was posing/ownership/transition behavior, not a need to resize bones.
- Sole plants capture points at most **5.11 px** from the actor's root depth line. The table's residual measures drift from those captured points, not a guarantee that every painted pixel is exactly on one global horizontal floor line. Near/far depth and painted sole calibration still matter.
- `summary.json` includes all case metrics and hashes of the modified runtime sources. `final-frames.jsonl.gz` preserves per-frame poses, both roles' joints/soles, and plant logs for all 320 cases. `mount-tuned.json` and `sweep-support-tuned.json` record pose-search results.
- **1,371 / 1,371 tests pass**, production build passes, `git diff --check` passes. Added regressions for complete shin recovery and a stable bilateral mount/alternating striking hand. Full logs: `tests.txt`, `build.txt`.

Contact distances in `metrics-table.md` are drawn joint/proxy-point distances around the damage event, not new painted-pixel contact proofs. The mount uses nearest fist tip; body stomps use ankle to torso target. Do not compare those two numbers as equivalent physical gaps.

## Per-move verdict and remaining limits

| Move | Legwork result | Still needs visual attention |
|---|---|---|
| Club blow | Load/impact support and smooth foot release; complete neutral exit. | Larger forced non-kit rigs can miss proxy target by 16 px; actual club users max about 9 px. |
| Running forearm | Rear support, explicit leg recovery, stale run blend cleared. | Entry is still a posed handoff from the gait; forced George runs retain up to 20 px/frame sole movement. Needs a dedicated gait-to-strike transition for complete polish. |
| Shoulder block | Stable impact supports and substantially smaller recovery foot jumps. | Deep body overlap/65-unit lunge remains an existing staging concern; worst point contact about 20 px. |
| Mounted punches | Both knees low, hips nearer abdomen, far/near leg layering, alternating punches, quiet receiver legs. | First George punch can be about 11 px from the face proxy. Joint contact and layering still need Derek's judgment at game scale. |
| Chop | Weight-bearing window and controlled release; neutral shins restored. | Worst point contact about 17 px; open-hand edge art remains the prior limitation. |
| Uppercut | Crouch loads into supported legs; recovery no longer inherits leg state. | Max plant residual 3.76 px; worst chin proxy miss under 10 px. |
| Back elbow | Stable stance/recovery and no post-fall facing snap. | Actual kit users George/Kowalski max chest proxy miss about 8 px. Forced Lou reaches 29 px; do not silently add it to his kit. |
| Leg sweep | Striking leg straighter; support error under .20 px. | Worst ankle proxy gap 27 px, including legal Guido cases. Fast foot travel is the moving sweep foot, not support-foot drift. Receiver-specific contact still needs work. |
| Axe handle to back | Supported loading/impact and clean leg return. | Bent-over receiver staging remains stylized; actual kit users max back proxy miss about 9 px. |
| Body stomps | Existing support retained; no standing-separation jump on dismount. | Remaining sole movement occurs through approach/release; max ankle/back proxy distance about 19 px. No fresh painted-contact proof claimed. |

The live page and `mount-preview.png` show the new mount. `sweep-preview.png` is a live-page capture, not an impact contact proof. Existing G10 recordings were left intact as the earlier visual reference. This is a corrected review candidate, not Derek's visual approval or a gate promotion.

## Reproduce

Use pinned Node 22, a Vite server, and installed Chrome. Example:

```sh
ALL=1 SHOTS=0 WFM_URL=http://127.0.0.1:5197 node tools/debug/legwork_audit.mjs /private/tmp/legwork-final
```

`ATTACKER=<rig>` shards the matrix, `RESUME=1` skips saved cases, `PAIR=<attacker>:<defender>` and `MOVES=<comma-separated>` restrict a review. Do not edit runtime files during a watched-server capture; HMR invalidates it. Four long Chrome shards may exhaust initialization resources; resume failed shards in fresh browsers. `legwork_report.py` packs the four named `/private/tmp/legwork-final-<name>` shards and baseline evidence. Normal-speed visual review is still necessary beyond measurements.
