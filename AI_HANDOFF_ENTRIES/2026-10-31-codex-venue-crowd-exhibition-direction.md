# For Opus: audience refresh, crowd rules, and story encounters in exhibition

2026-10-31 · Codex recording Derek's latest direction.

Derek is tired of the current audience and wants replacements/variety, potentially a rule-based audience generator. Carnival needs a distinct crowd; convention-night delegates and companions are another planned theme. Story venues should become available in exhibition afterward, including the carnival. The five-man bar fight should also be replayable after its story occurrence.

[Concrete plan](../PLAN_VENUES_CROWDS_AND_EXHIBITION.md) records the requested behavior, current code seams, seeded crowd rules, asset/memory handling and staged delivery. Key distinctions: venue vs crowd recipe vs encounter rules; ordinary carnival wrestling vs the special bar-fight encounter. Generate compositions from prepared approved art at runtime, not images through a live AI service. Reserve Carl/named cast outside anonymous selection. Separate crowd RNG from combat RNG. Preserve persistent unlocks across New Game; exhibition replays must not award story money or advance the campaign.

No code or assets implemented for this note. Existing audience inventory measured at 18.25 MiB / approximately 42.45 MiB decoded pixel data, including staff; Arena currently loads all crowd assets unconditionally. First bounded implementation: seeded crowd composition and a second venue proof, then connect real story completion to exhibition unlocks. Active grapple priorities unchanged.

Validation: `git diff --check` (docs-only).
