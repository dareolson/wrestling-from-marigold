# For Opus: Carl ringside art approved, keep for Guy match integration later

2026-10-31 · Codex · Derek's direction.

Derek approved the full-body Carl sheet ("it looks great") and asked to keep it for later, for adding to Guy's character during his matches. This is a deferred asset/integration note, not a change to the current grapple priorities.

- **Sheet:** [Carl ringside v1](../research/art/carl-ringside-2026-10-31/carl-ringside-sheet-v1.png).
- **Frame map and technical notes:** [manifest](../research/art/carl-ringside-2026-10-31/manifest.json), [README](../research/art/carl-ringside-2026-10-31/README.md).
- **Role:** Carl is Guy's trainer/cornerman, cheering and coaching at ringside during Guy's matches. Treat him as named supporting cast associated with Guy, not shuffled anonymous crowd art.
- **Eight full-body poses:** coaching row = attentive rest, cupped-hand call, pointing instruction, settle; cheering row = clap preparation, clap contact, fist pump, settle. Towel and brown shirt retained, hands free of tape. Native facing right.
- **Later implementation:** extract individual poses, normalize shared scale and foot anchors, place him facing into the ring, and bind coaching/cheering to Guy's side and match context. The pointing hand crosses an ideal equal-cell boundary, so do not blindly slice a fixed 4×2 atlas. Existing ringside two-animation extras are a rendering precedent; see [manager-system plan](../RINGSIDE_CAST_AND_MANAGER_SYSTEM.md).
- **Approval scope:** the full-body sheet's look is approved. Extraction, animation registration, placement and live match behavior are still future work. Original trainer identity master remains preserved; no dialogue master replacement is implied.

No gameplay code changed for this note. Validation: `git diff --check`.
