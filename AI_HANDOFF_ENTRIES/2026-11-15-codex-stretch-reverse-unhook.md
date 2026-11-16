# Stretch: reverse the leg hook on release

Derek requested that the attacker reverse the entry movement when unhooking, with special attention to calf stacking. Uncommitted in `/Users/home/Documents/wfm-stage12`, branch `moves/stage12`; no commit, merge or push. Preserve earlier move work.

Preview: http://127.0.0.1:5233/tools/mat-preview/?move=abdominalStretch&att=kowalski-roster-v1&def=thesz-procreate-v1

The old release simply faded the leg solve from 3–3.35s, dropping the calf straight back through the victim. Added an optional validated `legContacts[].releaseSweep` using the same outward/upward offsets as entry, played in reverse: hook at 3s, outside apex at 3.3s, leg lowered by 3.55s. The entry's .45/.65/.7/1s points map to release 3.55/3.35/3.3/3s respectively. Full leg contact and support-sole weight remain through 3.35s, then fade only after the calf has swung clear.

Calf/boot stay in front through 3.36s (the reverse of the .64s entry layer crossing), then return behind the victim while lowering. Upper thigh remains behind throughout. Attacker hips stay at the hold position through 3.35s, avoiding the earlier six-pixel shuffle during the unhook; the existing shove follows. Preserved knee-art tuck, arm entry, victim pry attempts, hands-first catch, squeeze damage and prone ending.

Tests: the same target returns to the identical outward apex on release in both facings; depth checks verify front calf at 3.3s and behind calf/boot at 3.4s across both channel mappings. 58 focused tests pass; build and whitespace checks pass. Full suite retains the five known art/fixture failures. Visual captures sample 3/3.18/3.3/3.38/3.47/3.56s for all four attacker rigs.

Final full suite: 1381 pass, 4 skip, 5 existing failures. Real executor checks with all four receiver rigs in both facings: eight finish standing/down-prone, zero browser errors or invalid joint samples. Release contact-error samples after 3.35s are deliberately blended away from the victim as the foot lowers; they are not failed full-weight contacts.

Evidence/scripts: `research/animation/stretch-release-reversal-2026-11-15/`. Changed: `src/animation/clips/matMoves.js`, `src/animation/MoveRuntime.js`, `src/animation/AnimationClip.js`, `tests/legContacts.test.js`, `tests/clipLayers.test.js`.
