# Deathlock: victim sits up and misses punches

Derek requested a different sell: try to sit up and punch the attacker, but fail to reach. Updated the deathlock in `/Users/home/Documents/wfm-stage12/src/animation/clips/matMoves.js`; uncommitted, no push or merge.

Victim now curls the torso up, chambers the fists and makes two camera-side punch attempts around 2.30s and 3.08s. The next pressure beat sends him back down. Both attempts use an upper-body bend about the stationary hips; the authored root, tilt, lift and trapped-leg channels stay fixed. Brief defender reach windows point the near fist toward the attacker's upper torso. These are visual reaches with no strike events or damage. Existing squeeze timing and damage are unchanged.

Visual evidence and scripts: `research/animation/deathlock-victim-sell-2026-11-15/`. Four runtime cases, George→Lou and Kowalski→Guido in both facings: zero hip drift at the two punch peaks; fist remains about 64–87px from the attacker's upper torso; attacker takes no damage; all three squeeze events fire; both actors release correctly; no browser errors. Maximum leg-contact error during the struggle about 0.40px.

28 focused clip/contact/layer tests pass, build passes, whitespace check passes. No shared runtime or new art changes in this pass. Pain expressions use the existing damage-driven face performance. Preview opened at http://127.0.0.1:5233/tools/mat-preview/?move=indianDeathlock .
