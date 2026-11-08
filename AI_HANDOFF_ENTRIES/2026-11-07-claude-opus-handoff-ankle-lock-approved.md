# Handoff: light moves plan, ankle lock staging and sell approved — Claude Opus, 2026-11-07

**Direction.** Derek moved off finishers to lighter moves. [PLAN_LIGHT_MOVES.md](../PLAN_LIGHT_MOVES.md) replaces PLAN_FINISHERS as the active front (finishers parked, not dropped). Trash list from Derek: `frontKick` ("gumby legs, no planted foot"; the clip bends the kicking knee with positive `lKnee` 1.55/1.3, support leg rigid) and `ankleLock` (he called it the toe hold; hands never on the foot). He wants each wrestler distinct as moves spread (Stage 4: one leg-hold slot per kit, Opus's table pending Derek).

**Ankle lock, all behind `?light=v1`:**
- T2.1 6a9f04c measure: hands 50-85 px off the boot.
- T2.2 be60b72 (Sonnet): its 5.9 px pass measured the wrist against shin-axis proxies; not real contact.
- T2.2b 6abf871 (Codex, reviewed): heel/toe `semanticAnchors` on Lou's and George's base shin (no PNG change); `gripTarget` uses `to.anchor`; `holdGrips` solves the forearm's painted `clutch` palm when a grip names `palm`. Reusable for any foot hold.
- T2.2c 58fccc9 / T2.2d e0294f8 (Sonnet): re-staged tall, boot in front, explicit layer order.
- T2.2e 64aa65b (Codex, reviewed): per-play `ankleLockEntryClip(distance)`, the attacker picks the boot up off the mat, the receiver never slides; receiver torso in the layer chain. Loop jpgs gitignored.
- T2.2f bb449b6: receiver far arm behind his torso; attacker starts past the boots. **Staging approved.**
- T2.3 d780c58: the receiver sells the three squeezes; 0.2 s lead-in replaces a 105-139 px first-frame pop. **Sell approved.**

**Polish list:** trapped leg crosses the attacker's legs 8 / 21 frames; free-leg silhouette overlap ~750 px; close entry stands on the shins for the 0.2 s lead-in; deep pickup squat; rope not drawn for the reach; Kowalski/Guido unchecked.

**Next:** T2.4, Opus writes the bent-boot contract (`variants.shin.ankleTwist`, same heel/toe anchor names, knee pivot identical to the base shin, foot angle taken from the held frames); T2.5 Codex draws Lou then George; T2.6 G2 page including `armBar` as-is. Then Stage 1 (kick), Stage 3 (step-over toehold), Stage 4 (kits).

**Repo:** all commits local on `story/marigold-opening`, not pushed. Focused tests only this session; full suite, build and coverage not run (due before any push or promotion). Uncommitted on purpose: the 3 old waistlock scripts.
