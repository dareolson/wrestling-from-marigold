#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"
if [[ -d /Users/home/.nvm/versions/node/v22.23.1/bin ]]; then
  export PATH="/Users/home/.nvm/versions/node/v22.23.1/bin:$PATH"
fi
mkdir -p "$SCRIPT_DIR/evidence"
node --test tests/walkPresentation.test.js tests/runPresentation.test.js tests/locomotionArms.test.js tests/wrestlingStance.test.js tests/readyWrist.test.js tests/gaitV2.test.js tests/gaitRun.test.js tests/gaitFlagOff.test.js tests/armStacking.test.js tests/partVariants.test.js tests/scissors.test.js tests/recoveryVariants.test.js tests/leapfrog.test.js tests/matMoves.test.js tests/moveContacts.test.js tests/legContacts.test.js tests/moveRuntime.test.js tests/animationClip.test.js > "$SCRIPT_DIR/evidence/focused-tests.txt"
npm run build > "$SCRIPT_DIR/evidence/build.txt" 2>&1
if [[ "${1:-}" == '--browser' ]]; then
  # Existing script expects a live Vite server on localhost:5185 and Chrome.
  node research/art/ready-grab-2026-11-24/neutral-check.mjs
fi
