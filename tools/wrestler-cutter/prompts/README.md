# Generation prompts

Character- and track-specific generation prompts, **in version control on
purpose**. The prompt that drove every Lou front3q generation lived on a desktop
until 2026-09-26, so nothing diffed it, nothing failed when it went stale, and it
went stale twice in twelve days without anything noticing — it contradicted four
of the ten requirements it was supposed to satisfy.

A prompt here is an artifact with the same standing as the tool it feeds. When a
requirement changes, the prompt changes in the same commit.

## Current

| prompt | track | status |
| --- | --- | --- |
| `lou-front3q-eight-part-v1.md` | shipped legacy rig, eight parts, `front3q` view | **APPROVED by Derek 2026-09-26**, after Codex's review and three corrections. The next generation proceeds from it. See the 2026-09-26 log entry in `AI_HANDOFF.md`. |

**One trap this prompt exists to stop repeating.**
`Sprite sheets/AI Pilot/Lou/v2-canonical/pass-a/thesz-canonical-v2.png` is a
**completely transparent** 4096x4096 PNG — zero pixels above alpha 16 — even
though its name reads like the canonical master and `pass-a/SHA256SUMS.txt` lists
it. The frozen proportion authority is
`pass-a/candidates/thesz-v2-pass-a-v3.png`, `sha256 ce78aea3…3dceb`, which the
manifest already pins at `production.passASheet` / `production.passASha256`.
Measure against the empty file and you measure nothing, silently.

Not to be confused with the **paused** canonical-v2 five-view track, whose
prompts are `../templates/GENERATION_PROMPT_TEMPLATE.md` and
`Sprite sheets/AI Pilot/Lou/v2-canonical/pass-a/PASS_A_PROMPT.md`. The eight-part
prompt deliberately does not inherit their five-view master, 4096x4096 guide
template, 530px crown-to-sole contract, or Pass-A/Pass-B structure.

## `history/`

Superseded prompts, kept **byte-identical** to what was actually used. They carry
no "SUPERSEDED" banner and should not be given one: they are evidence of what a
generation was asked for, and editing them destroys the only record of that. The
table below is where the status lives instead.

| file | used for | superseded by | why |
| --- | --- | --- | --- |
| `2026-09-13-codex-front3q-prompt.md` | front3q v3, v4, v5 | `lou-front3q-eight-part-v1.md` | Dated two days before Derek's 2026-09-15 verdict. Contradicts requirement 1 (demands Lou stay "lean… not thick, broad"), 8 (asks for painted pelvis hips), 9 (asks for separately authored near/far upper arms and thighs) and is silent on 10 (the headless torso). Its far-forearm / far-shin reasoning is correct and was carried forward; the prompt over-generalised it to the upper arm and thigh, which the rig cannot tell apart. |

`sha256` of `2026-09-13-codex-front3q-prompt.md`, as copied from
`~/Desktop/codex-front3q-prompt.md`:

```
4faab8a6a43f454966bf0b79d9c61bddb11cbb9a90c6365aa160c359b20affbd
```
