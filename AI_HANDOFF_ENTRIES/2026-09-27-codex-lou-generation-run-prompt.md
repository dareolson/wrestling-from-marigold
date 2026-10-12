# RETIRED prompt for a fresh Codex session — do not generate

> ## REVOKED — 2026-09-27
>
> Do not execute this launch prompt. Its controlling art prompt contains a
> broader/compact Lou requirement that Derek never requested. The direction was
> introduced by an AI and falsely attributed to him. The current recovery plan
> is `CHARACTER_ART_RECOVERY_AUDIT.md`; shipped Lou remains the production
> baseline and new work proceeds through small Procreate-normalized replacement
> families.

I approve the corrected prompt at
`tools/wrestler-cutter/prompts/lou-front3q-eight-part-v1.md` for the next image
generation attempt. Work from the repository and carry this through the art
generation and mechanical review gates, stopping before rig tuning or production
integration.

That tracked file is the **complete image-generation brief**. Do not replace it
with a shorter paraphrase when calling the image tool. Pass its full requirements
forward, along with the two approved reference images and their distinct roles.

## Model and quality requirement

Use the newest, highest-quality OpenAI models actually available to this Codex
session. Before generating, verify the current official OpenAI model guidance;
do not choose from memory.

As of 2026-09-27, the quality-first configuration is:

- Codex/reasoning model: **GPT-6 Astra**, with **max** reasoning effort when the
  session exposes that choice.
- Image model: **GPT Image 2.5 Sunburst** (`gpt-image-2.5-sunburst`).
- Image quality: **max**.
- Action: **generate**.
- Output: **PNG with a transparent background**.
- Preferred plate size: **3840x1920**. If the active tool rejects that size,
  fall back to 3072x1536, then 2048x1024, preserving the 2:1 plate ratio.

If Codex's built-in image-generation tool does not expose model, quality, size,
or background controls, do not pretend that it does. Use the highest-quality
built-in image tool available, record which controls were and were not exposed,
and continue. If official guidance names a newer quality-focused model than the
baseline above, use the newer model and record its exact identifier.

## Read before acting

Read these files completely, in order:

1. `AI_HANDOFF.md`, especially the Status summary and the latest 2026-09-26
   entry.
2. `AI_HANDOFF_ENTRIES/2026-09-26-next-session-brief-generation-prompt.md`.
3. `tools/wrestler-cutter/prompts/lou-front3q-eight-part-v1.md` — this is the
   approved, controlling art prompt. Follow all ten requirements and its exact
   4x2 row-major delivery order.
4. `RIG_AND_MOVE_PIPELINE.md`, section "Binding art to the rig."
5. `AI_HANDOFF_ENTRIES/2026-09-15-derek-front3q-verdict-and-next-generation-brief.md`.

Do not generate from the archived September 13 prompt.

## Preserve and prepare the references

Use both authorities and give each only its declared role:

- Identity, face, clean-shaven appearance, palette, and painted style:
  `Sprite sheets/AI Pilot/Lou/v2-layer-standardization/references/lou-canonical-chroma-v1.png`.
- Body build and proportions only: the `front3q` panel at
  `x=864, y=64, w=768, h=960` from
  `Sprite sheets/AI Pilot/Lou/v2-canonical/pass-a/candidates/thesz-v2-pass-a-v3.png`,
  whose required SHA-256 is
  `ce78aea34da48af54721c6babf74c46c71b29f00810ae26390d9c92cffc3dceb`.

Verify that SHA before generation. Inspect both references visually before using
them. Do not use `pass-a/thesz-canonical-v2.png`; it is a completely transparent
trap file. If useful, make a deterministic temporary crop of the approved v3
panel so the image model receives the intended view rather than the full sheet.

Do not use the rejected v4 or v5 artwork as an identity or proportion reference.
They may be inspected only to understand documented failure modes.

## Generate

Use the image-generation skill/tool with the two approved reference images and
the complete controlling prompt. Generate a **single 4x2 source plate** in this
exact row-major order:

```text
row 1: head | torso | upper_arm | thigh
row 2: near_forearm | far_forearm | near_shin | far_shin
```

There must be exactly eight isolated painted components. The torso is headless
and ends in a short neck stub; the separate head owns the full neck cylinder.
There is no pelvis layer. `upper_arm` and `thigh` are shared paintings. Forearms
and shins are separately authored near/far pieces. No whole arm or whole leg may
combine a joint the rig articulates.

Start with one max-quality candidate. Do not generate a large batch whose
failures cannot be diagnosed. If the plate fails a hard mechanical requirement,
record the exact failure and make a fresh generation with a prompt correction;
do not repaint or tune around structurally wrong art. Stop after three failed
generation attempts and report the repeated failure instead of burning more
iterations.

Write the first attempt under a new directory named
`Sprite sheets/AI Pilot/Lou/production-front3q-modular/v6-generated-candidate/`.
If a hard failure requires another generation, use a new sibling such as
`v6-generated-candidate-r2`; never overwrite an attempt. Never overwrite v4,
v5, production Lou, or `thesz-front3q-r1`.

## Process and verify independently

For a generated plate:

1. Preserve the original output unchanged.
2. Because a transparent image-model output arrives pre-alpha'd, run
   `npm run art:key-plate -- ORIGINAL.png KEYED.png` before cutting. Do not run
   the chroma-key remover on a transparent output.
3. Run the two cheapest fatal gates immediately:
   - Cut with
     `node tools/wrestler-cutter/cut-front3q-modular-board.mjs KEYED.png PARTS_DIR`.
     It must find exactly eight components, four per row. If it throws, this is
     a re-roll, not a repair.
   - Run `npm run art:map-candidate -- --parts PARTS_DIR` before authoring
     landmarks and inspect the torso neck pinch. Anything above **3%** means a
     head is baked into the torso and the plate is dead regardless of its build.
4. Confirm the detected row-major identities visually; do not trust component
   count or filenames alone.
5. Only after those gates pass, author `landmarks.json` from actual painted
   pixels, following section 7 of
   the controlling prompt. Do not invent anchors in transparent space.
6. Re-run `art:map-candidate` with the landmarks, then run
   `art:measure-joints` and `art:proofs` against the eight delivered parts.
7. Confirm requirements 1-10 using the prompt's traceability table. Mechanical
   green does not substitute for visual approval.
8. Produce the equal-height candidate-versus-Pass-A comparison at 265, 209, and
   154 pixels, assembled from the delivered parts. A separately generated whole
   figure is not approval evidence.

Use Node 22.23.1 as pinned by `.nvmrc`. Keep all generated source artwork in the
existing gitignored art tree. Do not silently commit generated images elsewhere.

## Stop gate

Stop and show Derek:

- the keyed 4x2 plate;
- the eight-part contact sheet;
- the neutral assembly made from those parts;
- the 265/209/154 comparison against the approved Pass-A v3 panel;
- the articulation proof and a concise requirements 1-10 pass/fail table;
- the exact reasoning model, image model, quality, resolution, and background
  settings actually used, including any controls the built-in tool did not
  expose.

Do not add the candidate to the rig tuner, write a binding config, alter `src/`,
activate a canonical-v2 runtime prerequisite, or replace production Lou until
Derek approves the assembled figure at game scale.
