# 2026-10-06 — The misattribution is in three commit messages, which no document can retract

Derek's 2026-09-27 correction — that he **never asked for Lou to be broader,
stockier, more compact, less lean, or shorter-legged**, and that Lou's intended
body is tall and relatively lanky — has been recorded in every *document* that
carried the false direction: the 2026-09-15 brief, the 2026-09-26 brief, the
2026-09-15 candidate entry, `AI_HANDOFF.md`, the tracked generation prompt (now
`RETIRED — DO NOT EXECUTE`), and the 2026-09-27 Codex launch prompt (`REVOKED`).

**Three commit messages also carry it, and a commit message cannot be edited.**
They are reachable by `git log`, `git show` and `git blame` forever, they are not
covered by any retraction above, and a future session reading history rather than
the working tree will find the invented requirement stated as Derek's verdict.
This file is the retraction of record for them.

| commit | date | what its message asserts | status |
| --- | --- | --- | --- |
| `0d5119c` | 2026-09-15 | Subject: "Record Derek's front3q verdict, and measure two of **his nine requirements**". Body: "His answers: the face carries identity but the body is too lean and too tall and **should be broader and more compact**, closer to Pass-A". | **The attribution is false.** Derek gave no such answer. The nine requirements were not his. |
| `c05e30b` | 2026-09-26 | Body: the 13 Sep prompt "instructs the generator to keep Lou 'lean... not thick, broad' — **requirement 1 reversed**", and "it reproduces **the leanness Derek rejected**". | **False.** Requirement 1 was itself the invention. The 13 Sep prompt was *correct* on build; it was not "reversed". Derek rejected no leanness. |
| `65ab92f` | 2026-09-27 | Body: "**Requirement 1 now reads 'match the broader, more compact Pass-A front3q proportions'**", and "**Derek approves the prompt as corrected. The next generation proceeds from it.**" | **Both false in effect.** Derek's approval was given on the false premise and is void (the prompt is RETIRED). No generation proceeds from it. |

## What is true instead

- Lou's intended body is **tall and relatively lanky**. The bulky/compact drift
  is a failure, not a target.
- The 13 Sep desktop prompt, archived at
  `tools/wrestler-cutter/prompts/history/2026-09-13-codex-front3q-prompt.md`, was
  **right** where those commits call it wrong: "Lou must remain lean, athletic,
  and period-accurate: not thick, broad, or bodybuilder-like." Its actual defects
  were requirements 8, 9 and 10 — the pelvis layers, the split upper arm and
  thigh, and the silence on the headless torso. Those three corrections stand.
- Measured 2026-09-26 with one method across four figures, which independently
  supports the correction: `LouTheszFullBodyRef.png` reads **46.7%** legs as a
  fraction of figure height, the rejected v5 draft **42.8%**, and the Pass-A v3
  `front3q` panel — which the retired prompt named as the *build* authority —
  **40.4%**, the most compact figure of the three. The drift toward compact was
  already in the Pass-A master, so that panel was the wrong build authority
  regardless of who asked for what. (`lou-canonical-chroma-v1.png` cannot be
  measured this way: its pose puts a 197-row arm gap where the crotch detector
  looks, the documented failure mode, and it returns a meaningless 65.8%.)

## How it propagated, for the audit

Each step took the previous step's attribution on trust and added force to it.
The chain was: an AI's reading of the v4 candidate → recorded in the 2026-09-15
brief under the headings "Derek's answers" and "Derek's nine requirements" →
`0d5119c` put that into the permanent log → the 2026-09-26 brief inherited it as
a *standing* requirement and made contradicting it a blocker → `c05e30b` →
Codex's addendum asked for requirement 1 to be stated more forcefully still
("match the broader, compact Pass-A front3q proportions", not merely "make him
broad") → the tracked prompt's §2 gave it three explicit prohibitions against
leanness, a SHA-pinned build reference, and a traceability row → `65ab92f`.

**Claude's part in it.** I wrote that §2. I did not question the attribution, and
I made the invented requirement considerably more enforceable than the brief it
came from — the prohibitions, the pinned build authority and the audit table were
all mine. I also had the one piece of evidence that should have prompted the
question: re-measuring showed the "torso width at 40% down" comparison *reversed*
at a common station, which was a signal that the leanness finding was weaker than
recorded. I corrected the row and did not ask what else was weak.

**The generalizable failure**: a document heading that asserts provenance
("Derek's answers") was treated as provenance by every subsequent reader,
including me, and no step cost anything to verify. Nothing in the chain was
dishonest; every step was a reasonable reading of the step before it. The defence
is to attribute direction to a *source* — a dated quote, a session, a message —
rather than to a name in a heading, and to treat "X requires this" with no cited
source as unattributed until confirmed.

## Not done, deliberately

The three commits are **not** rewritten. A rebase would touch 33 unpushed
commits to correct three messages, and rewriting history to erase an AI's
misattribution would destroy the evidence of how it happened — which is the part
worth keeping. They stay; this file is what corrects them.
