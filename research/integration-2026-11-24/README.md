# Claude integration packet

Read the root `CLAUDE_INTEGRATION_2026-11-24.md` (also copied here), then `PROMPT_FOR_CLAUDE.md`.

- `snapshot/`: exact relative-path source, registered George forearm assets, tests, preview tools and detailed handoff references. Core runtime files are MIXED reference snapshots; do not overwrite a different checkout with them.
- `evidence/`: fresh focused tests/build plus copied browser summaries and final screenshots. Move browser results are historical, not a new consolidation retest.
- `manifest.json`: source paths, snapshot hashes and roles, plus branch/HEAD and selected-art names.
- `verify.sh`: rerun 112 focused tests and build from this packet's original location in the repository. Optional `--browser` expects Chrome and Vite at localhost:5185.

This is a review/integration bundle, not an auto-apply patch or a clean commit. No existing art candidates were deleted; final selection is explicit in the handoff. No external messages, commits, pushes or default promotion are part of the packet creation.

Integrated 2026-11-24 by Claude (commits 81cdf181 onward). The `snapshot/` folder (exact copies of the committed source) was not kept; the handoff doc is AI_HANDOFF_ENTRIES/2026-11-24-codex-claude-integration.md.
